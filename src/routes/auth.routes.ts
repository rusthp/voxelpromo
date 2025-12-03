import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserModel } from '../models/User';
import { RefreshTokenModel } from '../models/RefreshToken';
import { logger } from '../utils/logger';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { loginSchema, registerSchema, changePasswordSchema } from '../validation/auth.validation';
import { authLimiter, registerLimiter, refreshLimiter } from '../middleware/rate-limit';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ACCESS_TOKEN_EXPIRY = '15m'; // Short-lived access token
const REFRESH_TOKEN_EXPIRY_DAYS = 7; // Longer-lived refresh token

/**
 * Generate access and refresh tokens
 */
async function generateTokens(userId: string, username: string, role: string, req: Request) {
  // Generate short-lived access token
  const accessToken = jwt.sign({ id: userId, username, role }, JWT_SECRET, {
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
    const { username, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await UserModel.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Usuário ou email já existe' });
    }

    // Create user (only admin can create admin users)
    const userRole = role === 'admin' ? 'user' : role || 'user';

    const user = new UserModel({
      username,
      email,
      password,
      role: userRole,
    });

    await user.save();
    logger.info(`New user registered: ${username} (${email})`);

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(
      user._id.toString(),
      user.username,
      user.role,
      req
    );

    return res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
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

    // Find user and include password
    const user = await UserModel.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Usuário inativo' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(
      user._id.toString(),
      user.username,
      user.role,
      req
    );

    logger.info(`User logged in: ${user.username} (${user.email})`);

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
      JWT_SECRET,
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

export { router as authRoutes };
