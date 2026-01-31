import { Router } from 'express';
import { TelegramService } from '../services/messaging/TelegramService';
import { logger } from '../utils/logger';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getUserSettingsService } from '../services/user/UserSettingsService';

const router = Router();

/**
 * GET /api/telegram/chats
 * List all groups/channels where the bot has been added
 * Uses getUpdates to discover available chats
 */
router.get('/chats', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const settingsService = getUserSettingsService();
    const userSettings = await settingsService.getSettings(userId);

    const botToken = userSettings.telegram?.botToken;
    const channelId = userSettings.telegram?.channelId; // Note: 'channelId' in DB (mapped to 'chatId' logic)

    if (!botToken || botToken.trim().length === 0) {
      return res.json({
        success: false,
        error: 'Bot não configurado. Verifique o Bot Token nas configurações.',
        chats: [],
        help: 'Para obter o Chat ID: 1) Adicione o bot ao grupo/canal, 2) Envie uma mensagem, 3) Clique em "Atualizar" aqui',
      });
    }

    // Instantiate service for this user
    const service = new TelegramService({
      botToken,
      chatId: channelId || ''
    });

    // Check if bot is valid
    const bot = service.getBot();
    if (!bot) {
      return res.json({
        success: false,
        error: 'Falha ao inicializar bot com o token fornecido',
        chats: []
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
router.get('/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const settingsService = getUserSettingsService();
    const userSettings = await settingsService.getSettings(userId);

    const botToken = userSettings.telegram?.botToken;
    const channelId = userSettings.telegram?.channelId;

    if (!botToken || botToken.trim().length === 0) {
      return res.json({
        success: false,
        configured: false,
        message: 'Bot Token não configurado',
      });
    }

    // Instantiate service for this user
    const service = new TelegramService({
      botToken,
      chatId: channelId || ''
    });

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
        chatId: channelId || null,
        message: channelId ? 'Bot configurado e pronto!' : 'Bot configurado, mas Chat ID não definido',
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
