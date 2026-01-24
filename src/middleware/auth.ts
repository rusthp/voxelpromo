import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserModel } from '../models/User';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
}

/**
 * Middleware to verify JWT token
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token não fornecido' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      res.status(401).json({ error: 'Token não fornecido' });
      return;
    }

    // Verify token - JWT_SECRET is MANDATORY
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      logger.error('❌ CRITICAL: JWT_SECRET not configured. Authentication disabled.');
      res.status(500).json({ error: 'Servidor não configurado corretamente' });
      return;
    }

    // Debug: Log secret hash (not the secret itself) to verify consistency
    const secretHash = crypto.createHash('sha256').update(jwtSecret).digest('hex').substring(0, 8);

    try {
      const decoded = jwt.verify(token, jwtSecret) as any;

      // Get user from database
      const user = await UserModel.findById(decoded.id).select('-password');

      if (!user) {
        res.status(401).json({ error: 'Usuário não encontrado' });
        return;
      }

      if (!user.isActive) {
        res.status(401).json({ error: 'Usuário inativo' });
        return;
      }

      // Attach user to request
      req.user = {
        id: String(user._id),
        username: user.username,
        email: user.email,
        role: user.role,
      };

      next();
    } catch (jwtError: any) {
      // Detailed JWT error logging
      const tokenPreview = token.substring(0, 20) + '...';

      if (jwtError.name === 'JsonWebTokenError') {
        logger.error(`❌ JWT Error: ${jwtError.message}`);
        logger.error(`   Token preview: ${tokenPreview}`);
        logger.error(`   Secret hash: ${secretHash}`);
        logger.error(`   Tip: Token may have been created with a different JWT_SECRET`);
        res.status(401).json({
          error: 'Token inválido',
          hint: 'Faça logout e login novamente',
        });
        return;
      }

      if (jwtError.name === 'TokenExpiredError') {
        logger.warn(`⏰ Token expired at: ${jwtError.expiredAt}`);
        res.status(401).json({ error: 'Token expirado', expiredAt: jwtError.expiredAt });
        return;
      }

      throw jwtError; // Re-throw unknown errors
    }
  } catch (error: any) {
    logger.error('Authentication error:', error);
    res.status(500).json({ error: 'Erro na autenticação' });
  }
};

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    return;
  }

  next();
};
