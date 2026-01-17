import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserModel } from '../models/User';
import { RefreshTokenModel } from '../models/RefreshToken';
import { logger } from '../utils/logger';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { loginSchema, registerSchema, changePasswordSchema } from '../validation/auth.validation';
import { authLimiter, registerLimiter, refreshLimiter, passwordResetLimiter } from '../middleware/rate-limit';

const router = Router();

/**
 * Get JWT_SECRET - throws if not configured
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }
  if (secret.length < 32) {
    logger.warn('⚠️ JWT_SECRET should be at least 32 characters for security');
  }
  return secret;
}

const ACCESS_TOKEN_EXPIRY = '8h'; // 8 hours for work sessions
const REFRESH_TOKEN_EXPIRY_DAYS = 30; // 30 days refresh token

/**
 * Generate access and refresh tokens
 */
async function generateTokens(userId: string, username: string, role: string, req: Request) {
  // Generate short-lived access token
  const accessToken = jwt.sign({ id: userId, username, role }, getJwtSecret(), {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  // Generate refresh token
  const refreshToken = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  // Save refresh token to database
  await RefreshTokenModel.create({
    token: refreshToken,
    userId,
    expiresAt,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return { accessToken, refreshToken };
}

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: johndoe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: mypassword123
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 default: user
 *     responses:
 *       201:
 *         description: User successfully registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error or user already exists
 *       500:
 *         description: Server error
 */
router.post('/register', registerLimiter, validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const { username, email, password, role, accountType, name, document } = req.body;

    // Check if user already exists
    const existingUser = await UserModel.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Usuário ou email já existe' });
    }

    // Validate Document (CPF/CNPJ) if provided
    if (document) {
      const { DocumentValidatorService } = await import('../services/DocumentValidatorService');
      const cleanDoc = document.replace(/\D/g, '');

      if (accountType === 'company') {
        if (!DocumentValidatorService.validateCNPJ(cleanDoc)) {
          return res.status(400).json({ error: 'CNPJ inválido' });
        }
      } else {
        // Individual - expect CPF
        if (!DocumentValidatorService.validateCPF(cleanDoc)) {
          return res.status(400).json({ error: 'CPF inválido' });
        }
      }
    }

    // ✅ Check if email already used trial (READ-ONLY - don't mark here)
    const existingTrialUser = await UserModel.findOne({
      email,
      hasUsedTrial: true
    });

    if (existingTrialUser) {
      return res.status(400).json({
        error: 'Este email já utilizou o período de teste gratuito.'
      });
    }

    // Create user (only admin can create admin users)
    const userRole = role === 'admin' ? 'user' : role || 'user';

    const user = new UserModel({
      username,
      email,
      password,
      role: userRole,
      billing: {
        type: accountType || 'individual',
        name: name || '',
        document: document || '',
      },
      plan: {
        tier: 'free',
        status: 'active',
      }
      // ❌ NOT marking hasUsedTrial here - will be marked in PaymentService when trial is activated
    });

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    user.emailVerified = false;

    await user.save();
    logger.info(`New user registered: ${username} (${email}) - awaiting email verification`);

    // Send verification email
    try {
      const { getEmailService } = await import('../services/EmailService');
      const emailService = getEmailService();
      if (emailService.isConfigured()) {
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/verify-email?token=${verificationToken}`;
        emailService.sendVerificationEmail(email, username, verificationUrl).catch(err => {
          logger.warn(`Failed to send verification email to ${email}:`, err.message);
        });
      }
    } catch (emailError) {
      logger.warn('Could not send verification email:', emailError);
    }

    return res.status(201).json({
      success: true,
      message: 'Conta criada! Verifique seu email para ativar sua conta.',
      requiresVerification: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error: any) {
    logger.error('Registration error:', error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const message =
        field === 'email' ? 'Este email já está em uso' : 'Este username já está em uso';
      return res.status(400).json({ error: message });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }

    return res.status(500).json({ error: error.message || 'Erro ao criar usuário' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user and get access tokens
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: mypassword123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials or inactive user
 *       500:
 *         description: Server error
 */
router.post('/login', authLimiter, validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    logger.info(`🔐 Login attempt for email: ${email}`);

    // Find user and include password + lockout fields
    const user = await UserModel.findOne({ email }).select('+password +lockUntil');

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // BRUTE FORCE PROTECTION: Check if account is locked
    if (user.isLocked()) {
      const minutesRemaining = Math.ceil((user.lockUntil!.getTime() - Date.now()) / 60000);
      logger.warn(`🔒 Account locked for ${email}, ${minutesRemaining} min remaining`);
      return res.status(423).json({
        error: `Conta temporariamente bloqueada. Tente novamente em ${minutesRemaining} minutos.`,
        lockedUntil: user.lockUntil
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Usuário inativo' });
    }

    // Check email verification
    if (!user.emailVerified) {
      return res.status(401).json({
        error: 'Email não verificado. Verifique sua caixa de entrada.',
        requiresVerification: true
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // BRUTE FORCE: Increment failed attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      // Lock account after 5 failed attempts (15 minutes)
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        logger.warn(`🔒 Account LOCKED for ${email} after ${user.failedLoginAttempts} failed attempts`);
      }

      await user.save({ validateBeforeSave: false });

      const attemptsRemaining = Math.max(0, 5 - user.failedLoginAttempts);
      if (attemptsRemaining > 0) {
        return res.status(401).json({
          error: `Credenciais inválidas. ${attemptsRemaining} tentativas restantes.`
        });
      }
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // SUCCESS: Reset failed attempts and lockout
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(
      user._id.toString(),
      user.username,
      user.role,
      req
    );

    logger.info(`✅ User logged in: ${user.username} (${user.email})`);

    return res.json({
      success: true,
      message: 'Login realizado com sucesso',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    logger.error('Login error:', error);
    return res.status(500).json({ error: error.message || 'Erro ao fazer login' });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', refreshLimiter, async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token é obrigatório' });
    }

    // Find refresh token in database
    const tokenDoc = await RefreshTokenModel.findOne({
      token: refreshToken,
      isRevoked: false,
    });

    if (!tokenDoc) {
      return res.status(401).json({ error: 'Refresh token inválido' });
    }

    // Check if token is expired
    if (tokenDoc.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Refresh token expirado' });
    }

    // Get user
    const user = await UserModel.findById(tokenDoc.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Usuário inválido ou inativo' });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      getJwtSecret(),
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    logger.info(`Access token refreshed for user: ${user.username}`);

    return res.json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    logger.error('Refresh token error:', error);
    return res.status(500).json({ error: error.message || 'Erro ao renovar token' });
  }
});

/**
 * POST /api/auth/logout
 * Logout and revoke refresh token
 */
router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Revoke refresh token
      await RefreshTokenModel.updateOne(
        { token: refreshToken },
        { isRevoked: true }
      );
    }

    logger.info(`User logged out: ${req.user!.username}`);
    res.json({ success: true, message: 'Logout realizado com sucesso' });
  } catch (error: any) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: error.message || 'Erro ao fazer logout' });
  }
});

/**
 * POST /api/auth/logout-all
 * Revoke all refresh tokens for the user
 */
router.post('/logout-all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await RefreshTokenModel.updateMany(
      { userId: req.user!.id, isRevoked: false },
      { isRevoked: true }
    );

    logger.info(`All sessions revoked for user: ${req.user!.username}`);
    res.json({ success: true, message: 'Todos os dispositivos foram desconectados' });
  } catch (error: any) {
    logger.error('Logout all error:', error);
    res.status(500).json({ error: error.message || 'Erro ao desconectar dispositivos' });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await UserModel.findById(req.user!.id).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    return res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    logger.error('Get user error:', error);
    return res.status(500).json({ error: error.message || 'Erro ao buscar usuário' });
  }
});

/**
 * PUT /api/auth/change-password
 * Change user password
 */
router.put(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await UserModel.findById(req.user!.id).select('+password');

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Verify current password
      const isPasswordValid = await user.comparePassword(currentPassword);

      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Senha atual incorreta' });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Revoke all refresh tokens (force re-login on all devices)
      await RefreshTokenModel.updateMany(
        { userId: user._id, isRevoked: false },
        { isRevoked: true }
      );

      logger.info(`Password changed for user: ${user.username}`);

      return res.json({
        success: true,
        message: 'Senha alterada com sucesso. Faça login novamente em todos os dispositivos.',
      });
    } catch (error: any) {
      logger.error('Change password error:', error);
      return res.status(500).json({ error: error.message || 'Erro ao alterar senha' });
    }
  }
);

/**
 * POST /api/auth/forgot-password
 * Request password reset email
 * 
 * SECURITY:
 * - Rate limited (5 req / 15 min per IP)
 * - Generic response (prevents user enumeration)
 * - Token hashed with SHA256 before storage
 * - 15 minute expiration
 */
router.post('/forgot-password', passwordResetLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    // Log request (without exposing full email)
    const emailHash = crypto.createHash('sha256').update(email.toLowerCase()).digest('hex').substring(0, 8);
    logger.info(`Password reset requested for email hash: ${emailHash}`);

    // Find user (don't reveal if exists or not)
    const user = await UserModel.findOne({ email: email.toLowerCase() });

    if (user && user.isActive) {
      // Generate random token
      const resetToken = crypto.randomBytes(32).toString('hex');

      // Hash token before storing (never store plain token)
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      // Set token and expiry (15 minutes)
      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000);
      await user.save({ validateBeforeSave: false });

      // Build reset URL
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

      // Send email
      const { getEmailService } = await import('../services/EmailService');
      const emailService = getEmailService();

      if (emailService.isConfigured()) {
        await emailService.sendPasswordResetEmail(user.email, resetUrl);
        logger.info(`Password reset email sent to hash: ${emailHash}`);
      } else {
        // Development fallback: log the URL
        logger.warn(`Email not configured. Reset URL: ${resetUrl}`);
      }
    }

    // ALWAYS return same response (prevents user enumeration)
    return res.json({
      success: true,
      message: 'Se existe uma conta com este email, você receberá um link para redefinir sua senha.',
    });

  } catch (error: any) {
    logger.error('Forgot password error:', error);
    // Still return success to prevent enumeration
    return res.json({
      success: true,
      message: 'Se existe uma conta com este email, você receberá um link para redefinir sua senha.',
    });
  }
});

/**
 * POST /api/auth/reset-password/:token
 * Reset password using token from email
 * 
 * SECURITY:
 * - Token is hashed and compared
 * - Token expires after 15 minutes
 * - Token invalidated after use
 * - All sessions revoked after reset
 */
router.post('/reset-password/:token', passwordResetLimiter, async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres' });
    }

    // Hash the provided token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const user = await UserModel.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpire');

    if (!user) {
      logger.warn(`Invalid/expired reset token attempted`);
      return res.status(400).json({
        error: 'Este link expirou ou é inválido. Solicite um novo link de redefinição.',
      });
    }

    // Update password
    user.password = password;

    // Invalidate token (one-time use)
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    // Revoke all refresh tokens (force re-login everywhere)
    await RefreshTokenModel.updateMany(
      { userId: user._id, isRevoked: false },
      { isRevoked: true }
    );

    logger.info(`Password reset successful for user: ${user.username}`);

    return res.json({
      success: true,
      message: 'Senha redefinida com sucesso! Faça login com sua nova senha.',
    });

  } catch (error: any) {
    logger.error('Reset password error:', error);
    return res.status(500).json({ error: 'Erro ao redefinir senha. Tente novamente.' });
  }
});

/**
 * GET /api/auth/validate-reset-token/:token
 * Validate if a reset token is still valid (for frontend pre-check)
 */
router.get('/validate-reset-token/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ valid: false });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await UserModel.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: new Date() },
    }).select('_id');

    return res.json({ valid: !!user });

  } catch (error: any) {
    logger.error('Validate reset token error:', error);
    return res.json({ valid: false });
  }
});

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify user email with token
 *     tags: [Authentication]
 */
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token de verificação é obrigatório' });
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const user = await UserModel.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpire: { $gt: new Date() },
    }).select('+emailVerificationToken +emailVerificationExpire');

    if (!user) {
      return res.status(400).json({ error: 'Token inválido ou expirado' });
    }

    // Mark email as verified
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    logger.info(`Email verified for user: ${user.email}`);

    return res.json({
      success: true,
      message: 'Email verificado com sucesso! Você já pode fazer login.',
    });

  } catch (error: any) {
    logger.error('Email verification error:', error);
    return res.status(500).json({ error: 'Erro ao verificar email' });
  }
});

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Resend verification email
 *     tags: [Authentication]
 */
router.post('/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    const user = await UserModel.findOne({ email });

    if (!user) {
      // Don't reveal if user exists
      return res.json({ success: true, message: 'Se o email existir, enviaremos um novo link de verificação.' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ error: 'Este email já foi verificado' });
    }

    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    // Send verification email
    try {
      const { getEmailService } = await import('../services/EmailService');
      const emailService = getEmailService();
      if (emailService.isConfigured()) {
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/verify-email?token=${verificationToken}`;
        await emailService.sendVerificationEmail(email, user.username, verificationUrl);
      }
    } catch (emailError) {
      logger.warn('Could not resend verification email:', emailError);
    }

    return res.json({ success: true, message: 'Se o email existir, enviaremos um novo link de verificação.' });

  } catch (error: any) {
    logger.error('Resend verification error:', error);
    return res.status(500).json({ error: 'Erro ao reenviar email de verificação' });
  }
});

export { router as authRoutes };
