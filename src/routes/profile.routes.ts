import { Router, Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { UserModel } from '../models/User';
import { logger } from '../utils/logger';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Extend AuthRequest to include multer file
interface AuthRequestWithFile extends AuthRequest {
    file?: Express.Multer.File;
}

// Configure multer for avatar uploads
const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
        cb(null, uploadDir);
    },
    filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id || 'unknown';
        const ext = path.extname(file.originalname);
        cb(null, `avatar-${userId}-${Date.now()}${ext}`);
    },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de arquivo não permitido. Use JPEG, PNG, GIF ou WebP.'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
    },
});

/**
 * GET /api/profile
 * Get current user profile
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = await UserModel.findById(req.user!.id).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        return res.json({
            success: true,
            profile: {
                id: user._id,
                username: user.username,
                email: user.email,
                displayName: user.displayName || user.username,
                avatarUrl: user.avatarUrl,
                role: user.role,
                preferences: user.preferences || {
                    theme: 'dark',
                    emailNotifications: true,
                    pushNotifications: true,
                },
                createdAt: user.createdAt,
                lastLogin: user.lastLogin,
                billing: user.billing,
                plan: user.plan,
            },
        });
    } catch (error: any) {
        logger.error('Get profile error:', error);
        return res.status(500).json({ error: error.message || 'Erro ao buscar perfil' });
    }
});

/**
 * PUT /api/profile
 * Update user profile
 */
router.put('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { displayName, preferences } = req.body;

        const updateData: any = {};

        if (displayName !== undefined) {
            updateData.displayName = displayName;
        }

        if (preferences) {
            if (preferences.theme) {
                updateData['preferences.theme'] = preferences.theme;
            }
            if (preferences.emailNotifications !== undefined) {
                updateData['preferences.emailNotifications'] = preferences.emailNotifications;
            }
            if (preferences.pushNotifications !== undefined) {
                updateData['preferences.pushNotifications'] = preferences.pushNotifications;
            }
        }

        if (req.body.billing) {
            const { type, document, name, phone, address } = req.body.billing;
            // Minimal validation
            if (type && ['individual', 'company'].includes(type)) updateData['billing.type'] = type;
            if (document) updateData['billing.document'] = document;
            if (name) updateData['billing.name'] = name;
            if (phone) updateData['billing.phone'] = phone;

            if (address) {
                if (address.street) updateData['billing.address.street'] = address.street;
                if (address.number) updateData['billing.address.number'] = address.number;
                if (address.complement) updateData['billing.address.complement'] = address.complement;
                if (address.neighborhood) updateData['billing.address.neighborhood'] = address.neighborhood;
                if (address.city) updateData['billing.address.city'] = address.city;
                if (address.state) updateData['billing.address.state'] = address.state;
                if (address.zipCode) updateData['billing.address.zipCode'] = address.zipCode;
            }
        }

        const user = await UserModel.findByIdAndUpdate(
            req.user!.id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        logger.info(`Profile updated for user: ${user.username}`);

        return res.json({
            success: true,
            message: 'Perfil atualizado com sucesso',
            profile: {
                id: user._id,
                username: user.username,
                email: user.email,
                displayName: user.displayName || user.username,
                avatarUrl: user.avatarUrl,
                role: user.role,
                preferences: user.preferences,
                billing: user.billing,
                plan: user.plan,
            },
        });
    } catch (error: any) {
        logger.error('Update profile error:', error);
        return res.status(500).json({ error: error.message || 'Erro ao atualizar perfil' });
    }
});

/**
 * POST /api/profile/avatar
 * Upload user avatar
 */
router.post(
    '/avatar',
    authenticate,
    upload.single('avatar'),
    async (req: AuthRequestWithFile, res: Response) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'Nenhum arquivo enviado' });
            }

            // Get current user to delete old avatar
            const currentUser = await UserModel.findById(req.user!.id);

            if (currentUser?.avatarUrl) {
                // Delete old avatar file
                const oldAvatarPath = path.join(process.cwd(), currentUser.avatarUrl);
                if (fs.existsSync(oldAvatarPath)) {
                    fs.unlinkSync(oldAvatarPath);
                }
            }

            // Save new avatar URL
            const avatarUrl = `/uploads/avatars/${req.file.filename}`;

            const user = await UserModel.findByIdAndUpdate(
                req.user!.id,
                { $set: { avatarUrl } },
                { new: true }
            ).select('-password');

            if (!user) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }

            logger.info(`Avatar uploaded for user: ${user.username}`);

            return res.json({
                success: true,
                message: 'Avatar atualizado com sucesso',
                avatarUrl: user.avatarUrl,
            });
        } catch (error: any) {
            logger.error('Avatar upload error:', error);
            return res.status(500).json({ error: error.message || 'Erro ao fazer upload do avatar' });
        }
    }
);

/**
 * DELETE /api/profile/avatar
 * Remove user avatar
 */
router.delete('/avatar', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = await UserModel.findById(req.user!.id);

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        if (user.avatarUrl) {
            // Delete avatar file
            const avatarPath = path.join(process.cwd(), user.avatarUrl);
            if (fs.existsSync(avatarPath)) {
                fs.unlinkSync(avatarPath);
            }

            // Clear avatar URL
            user.avatarUrl = undefined;
            await user.save();
        }

        logger.info(`Avatar removed for user: ${user.username}`);

        return res.json({
            success: true,
            message: 'Avatar removido com sucesso',
        });
    } catch (error: any) {
        logger.error('Avatar delete error:', error);
        return res.status(500).json({ error: error.message || 'Erro ao remover avatar' });
    }
});

export { router as profileRoutes };
