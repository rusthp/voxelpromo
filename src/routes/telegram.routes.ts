import { Router } from 'express';
import { TelegramService } from '../services/messaging/TelegramService';
import { logger } from '../utils/logger';

const router = Router();

// Telegram service instance (singleton pattern)
let telegramService: TelegramService | null = null;

function getTelegramService(): TelegramService {
    if (!telegramService) {
        telegramService = new TelegramService();
    }
    return telegramService;
}

/**
 * GET /api/telegram/chats
 * List all groups/channels where the bot has been added
 * Uses getUpdates to discover available chats
 */
router.get('/chats', async (_req, res) => {
    try {
        const service = getTelegramService();
        const bot = service.getBot();

        if (!bot) {
            return res.json({
                success: false,
                error: 'Bot não configurado. Verifique o Bot Token nas configurações.',
                chats: [],
                help: 'Para obter o Chat ID: 1) Adicione o bot ao grupo/canal, 2) Envie uma mensagem, 3) Clique em "Atualizar" aqui',
            });
        }

        const chats = await service.listChats();

        if (chats.length === 0) {
            return res.json({
                success: true,
                chats: [],
                count: 0,
                help: 'Nenhum grupo encontrado. Para descobrir grupos: 1) Adicione o bot ao grupo, 2) Envie uma mensagem no grupo, 3) Clique em "Atualizar" aqui',
            });
        }

        return res.json({
            success: true,
            chats: chats,
            count: chats.length,
        });
    } catch (error: any) {
        logger.error('Error listing Telegram chats:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Erro ao listar grupos',
            chats: [],
        });
    }
});

/**
 * GET /api/telegram/status
 * Check if Telegram bot is configured and working
 */
router.get('/status', async (_req, res) => {
    try {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        if (!botToken) {
            return res.json({
                success: false,
                configured: false,
                message: 'Bot Token não configurado',
            });
        }

        const service = getTelegramService();
        const bot = service.getBot();

        if (!bot) {
            return res.json({
                success: false,
                configured: false,
                message: 'Não foi possível inicializar o bot',
            });
        }

        // Try to get bot info to verify token is valid
        try {
            const me = await bot.getMe();
            return res.json({
                success: true,
                configured: true,
                botUsername: me.username,
                botName: me.first_name,
                chatId: chatId || null,
                message: chatId ? 'Bot configurado e pronto!' : 'Bot configurado, mas Chat ID não definido',
            });
        } catch (error: any) {
            return res.json({
                success: false,
                configured: false,
                message: `Token inválido: ${error.message}`,
            });
        }
    } catch (error: any) {
        logger.error('Error checking Telegram status:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Erro ao verificar status',
        });
    }
});

export default router;
