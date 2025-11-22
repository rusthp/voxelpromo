import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { logger } from '../utils/logger';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, role } = req.body;

    // Validation
    if (!username || !email || !password) {
      res.status(400).json({ error: 'Username, email e senha são obrigatórios' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
      return;
    }

    // Check if user already exists
    const existingUser = await UserModel.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      res.status(400).json({ error: 'Usuário ou email já existe' });
      return;
    }

    // Create user (only admin can create admin users)
    const userRole = role === 'admin' ? 'user' : (role || 'user');

    const user = new UserModel({
      username,
      email,
      password,
      role: userRole
    });

    await user.save();

    logger.info(`New user registered: ${username} (${email})`);

    // Generate token
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error: any) {
    logger.error('Registration error:', error);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const message = field === 'email' 
        ? 'Este email já está em uso' 
        : 'Este username já está em uso';
      res.status(400).json({ error: message });
      return;
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      res.status(400).json({ error: messages.join(', ') });
      return;
    }
    
    // Generic error
    const errorMessage = error.message || 'Erro ao criar usuário';
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      res.status(400).json({ error: 'Email e senha são obrigatórios' });
      return;
    }

    // Find user and include password
    const user = await UserModel.findOne({ email }).select('+password');

    if (!user) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({ error: 'Usuário inativo' });
      return;
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      jwtSecret,
      { expiresIn: '7d' }
    );

    logger.info(`User logged in: ${user.username} (${user.email})`);

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error: any) {
    logger.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Erro ao fazer login' });
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
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });
  } catch (error: any) {
    logger.error('Get user error:', error);
    res.status(500).json({ error: error.message || 'Erro ao buscar usuário' });
  }
});

/**
 * POST /api/auth/logout
 * Logout (client-side token removal, this is just for logging)
 */
router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    logger.info(`User logged out: ${req.user!.username}`);
    res.json({ success: true, message: 'Logout realizado com sucesso' });
  } catch (error: any) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: error.message || 'Erro ao fazer logout' });
  }
});

/**
 * PUT /api/auth/change-password
 * Change user password
 */
router.put('/change-password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'Nova senha deve ter no mínimo 6 caracteres' });
      return;
    }

    const user = await UserModel.findById(req.user!.id).select('+password');

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      res.status(401).json({ error: 'Senha atual incorreta' });
      return;
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info(`Password changed for user: ${user.username}`);

    res.json({ success: true, message: 'Senha alterada com sucesso' });
  } catch (error: any) {
    logger.error('Change password error:', error);
    res.status(500).json({ error: error.message || 'Erro ao alterar senha' });
  }
});

export { router as authRoutes };

