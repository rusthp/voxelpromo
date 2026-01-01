import { Router } from 'express';
import { WhatsAppServiceFactory } from '../services/messaging/WhatsAppServiceFactory';
import { logger } from '../utils/logger';
import { readFileSync, existsSync, readdirSync, unlinkSync, rmdirSync } from 'fs';
import { join } from 'path';
import { loadConfigFromFile } from '../utils/loadConfig';

const router = Router();

// Store service instances - exported for use by other services
export const serviceInstances = new Map<string, any>();

/**
 * Get WhatsApp service instance (singleton)
 * Exported for use by StatusAutomationService
 */
export function getWhatsAppService() {
  // Load config to get library preference
  const configPath = join(process.cwd(), 'config.json');
  let library = 'baileys';

  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      library = config.whatsapp?.library || process.env.WHATSAPP_LIBRARY || 'baileys';
    } catch (error) {
      logger.error('Error reading config for WhatsApp library:', error);
    }
  }

  const key = library;
  if (!serviceInstances.has(key)) {
    const service = WhatsAppServiceFactory.create(library);
    serviceInstances.set(key, service);
  }

  return serviceInstances.get(key);
}


/**
 * GET /api/whatsapp/qr
 * Get current QR code
 */
router.get('/qr', async (_req, res) => {
  try {
    // Reload config before getting service (force reload to get latest)
    loadConfigFromFile(true); // Force reload

    const service = getWhatsAppService();
    const qrCode = service.getQRCode();

    if (qrCode) {
      const qrHash = `${qrCode.substring(0, 20)}...${qrCode.substring(qrCode.length - 20)}`;
      logger.debug(`📤 Returning QR code to frontend (length: ${qrCode.length}, hash: ${qrHash})`);

      // Get connection info to include QR code timestamp and Data URL
      let qrCodeTimestamp: number | undefined;
      let qrCodeDataURL: string | undefined;
      if (typeof (service as any).getConnectionInfo === 'function') {
        const connInfo = (service as any).getConnectionInfo();
        qrCodeTimestamp = connInfo?.qrCodeTimestamp;
        qrCodeDataURL = connInfo?.qrCodeDataURL;
      }

      // Also try direct method to get Data URL if available
      if (!qrCodeDataURL && typeof (service as any).getQRCodeDataURL === 'function') {
        qrCodeDataURL = (service as any).getQRCodeDataURL();
      }

      if (qrCodeDataURL) {
        logger.debug('✅ QR Code Data URL included in response');
      } else {
        logger.debug('⚠️ QR Code Data URL not available (may not be generated yet)');
      }

      return res.json({
        success: true,
        qrCode: qrCode,
        qrCodeDataURL: qrCodeDataURL,
        timestamp: Date.now(), // Current API response timestamp
        qrCodeTimestamp: qrCodeTimestamp || Date.now(), // When QR code was generated
        qrCodeHash: qrHash, // For debugging - verify same QR code
        message: 'QR Code disponível. Escaneie com seu WhatsApp.',
      });
    } else {
      // Try to initialize to trigger QR code generation
      await service.initialize();

      // Wait a bit for QR code to be generated
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const qrCodeAfterInit = service.getQRCode();
      if (qrCodeAfterInit) {
        const qrHash = `${qrCodeAfterInit.substring(0, 20)}...${qrCodeAfterInit.substring(qrCodeAfterInit.length - 20)}`;
        logger.debug(
          `📤 QR Code generated after init (length: ${qrCodeAfterInit.length}, hash: ${qrHash})`
        );

        // Get connection info to include QR code timestamp and Data URL
        let qrCodeTimestamp: number | undefined;
        let qrCodeDataURL: string | undefined;
        if (typeof (service as any).getConnectionInfo === 'function') {
          const connInfo = (service as any).getConnectionInfo();
          qrCodeTimestamp = connInfo?.qrCodeTimestamp;
          qrCodeDataURL = connInfo?.qrCodeDataURL;
        }

        // Also try direct method to get Data URL if available
        if (!qrCodeDataURL && typeof (service as any).getQRCodeDataURL === 'function') {
          qrCodeDataURL = (service as any).getQRCodeDataURL();
        }

        return res.json({
          success: true,
          qrCode: qrCodeAfterInit,
          qrCodeDataURL: qrCodeDataURL,
          timestamp: Date.now(),
          qrCodeTimestamp: qrCodeTimestamp || Date.now(),
          qrCodeHash: qrHash,
          message: 'QR Code gerado. Escaneie com seu WhatsApp.',
        });
      }

      return res.json({
        success: false,
        qrCode: null,
        message: service.isReady()
          ? 'WhatsApp já está conectado. Não é necessário QR code.'
          : 'QR Code ainda não foi gerado. Aguarde alguns segundos e tente novamente.',
      });
    }
  } catch (error: any) {
    logger.error('Error getting WhatsApp QR code:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao obter QR code',
    });
  }
});

/**
 * GET /api/whatsapp/status
 * Get WhatsApp connection status
 */
router.get('/status', async (_req, res) => {
  try {
    // Config is cached, no need to force reload on every status check
    // Only reload if explicitly requested (not on every poll)
    loadConfigFromFile(false); // Use cache - don't force reload to reduce log spam

    const service = getWhatsAppService();
    const isReady = service.isReady();
    const qrCode = service.getQRCode();

    // Get additional connection info if available (Baileys supports this)
    let connectionInfo: any = null;
    if (typeof (service as any).getConnectionInfo === 'function') {
      connectionInfo = (service as any).getConnectionInfo();
    }

    // Check for auth files
    const authDir = join(process.cwd(), 'auth_info_baileys');
    const hasAuthFiles = existsSync(authDir);

    // Get QR code timestamp and Data URL from connection info if available
    const qrCodeTimestamp = connectionInfo?.qrCodeTimestamp || (qrCode ? Date.now() : 0);
    const qrCodeDataURL = connectionInfo?.qrCodeDataURL;

    // Calculate QR code hash for debugging
    const qrCodeHash = qrCode
      ? `${qrCode.substring(0, 20)}...${qrCode.substring(qrCode.length - 20)}`
      : null;

    // Always return QR code if available (even if it's the same, to ensure frontend sync)
    return res.json({
      success: true,
      isReady: isReady,
      hasQRCode: !!qrCode,
      qrCode: qrCode || null, // Explicitly return null if no QR code
      qrCodeDataURL: qrCodeDataURL || null, // QR code as Data URL (image)
      qrCodeHash: qrCodeHash, // For debugging - verify same QR code
      hasAuthFiles: hasAuthFiles,
      connectionInfo: connectionInfo,
      timestamp: Date.now(), // Current API response timestamp
      qrCodeTimestamp: qrCodeTimestamp, // When QR code was generated/updated
      message: isReady
        ? 'WhatsApp conectado e pronto!'
        : qrCode
          ? 'QR Code disponível. Escaneie para conectar.'
          : hasAuthFiles
            ? 'Arquivos de autenticação encontrados, mas não conectado. Tente gerar novo QR code.'
            : 'Aguardando geração do QR code...',
    });
  } catch (error: any) {
    logger.error('Error getting WhatsApp status:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao obter status',
    });
  }
});

/**
 * POST /api/whatsapp/initialize
 * Force initialization (to trigger QR code generation)
 */
router.post('/initialize', async (_req, res) => {
  try {
    // Force reload config before initializing to ensure latest settings
    loadConfigFromFile(true); // Force reload

    const service = getWhatsAppService();

    // Force re-initialization to generate new QR code
    // Try to call with force=true if supported (Baileys supports this)
    if (typeof (service as any).initialize === 'function') {
      try {
        await (service as any).initialize(true);
      } catch (error) {
        logger.warn('Force initialize not supported, using normal initialize:', error);
        await service.initialize();
      }
    } else {
      await service.initialize();
    }

    // Wait a bit longer for QR code to be generated (Baileys may need more time)
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const qrCode = service.getQRCode();
    const isReady = service.isReady();

    // Get Data URL if available
    let qrCodeDataURL: string | undefined;
    if (typeof (service as any).getQRCodeDataURL === 'function') {
      qrCodeDataURL = (service as any).getQRCodeDataURL();
    }

    return res.json({
      success: true,
      message: isReady
        ? 'WhatsApp conectado e pronto!'
        : qrCode
          ? 'QR Code gerado! Escaneie com seu WhatsApp.'
          : 'WhatsApp inicializando... Aguarde alguns segundos e verifique novamente.',
      qrCode: qrCode,
      qrCodeDataURL: qrCodeDataURL,
      isReady: isReady,
    });
  } catch (error: any) {
    logger.error('Error initializing WhatsApp:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao inicializar WhatsApp',
    });
  }
});

/**
 * POST /api/whatsapp/test
 * Send a test message to verify WhatsApp connection
 */
router.post('/test', async (_req, res) => {
  try {
    const service = getWhatsAppService();

    if (!service.isReady()) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp não está conectado. Escaneie o QR code primeiro.',
      });
    }

    // Create a test offer (no affiliateUrl to skip LinkVerifier validation)
    const testOffer = {
      title: '🔔 Teste de Conexão VoxelPromo',
      description: 'Se você recebeu esta mensagem, o WhatsApp está funcionando corretamente!',
      currentPrice: 0,
      originalPrice: 0,
      discountPercentage: 0,
      affiliateUrl: '', // Empty to skip link verification
      imageUrl: '',
      source: 'test',
      aiGeneratedPost: `🔔 *Teste de Conexão VoxelPromo*\n\n✅ WhatsApp está funcionando corretamente!\n\n⏰ ${new Date().toLocaleString('pt-BR')}\n\n_Mensagem de teste automático_`,
    };

    const success = await service.sendOffer(testOffer as any);

    if (success) {
      logger.info('✅ WhatsApp test message sent successfully');
      return res.json({
        success: true,
        message: 'Mensagem de teste enviada com sucesso! Verifique o grupo.',
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Falha ao enviar mensagem de teste. Verifique os logs.',
      });
    }
  } catch (error: any) {
    logger.error('Error sending WhatsApp test message:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao enviar mensagem de teste',
    });
  }
});

/**
 * DELETE /api/whatsapp/auth
 * Clear authentication files to force new QR code generation
 */
router.delete('/auth', async (_req, res) => {
  try {
    const authDir = join(process.cwd(), 'auth_info_baileys');

    if (!existsSync(authDir)) {
      return res.json({
        success: true,
        message: 'Nenhum arquivo de autenticação encontrado.',
      });
    }

    logger.info('Clearing WhatsApp authentication files...');
    const files = readdirSync(authDir);
    let deletedCount = 0;

    for (const file of files) {
      try {
        unlinkSync(join(authDir, file));
        deletedCount++;
      } catch (error) {
        logger.warn(`Could not delete ${file}:`, error);
      }
    }

    try {
      rmdirSync(authDir);
      logger.info(`✅ ${deletedCount} arquivos de autenticação removidos`);
    } catch (error) {
      logger.warn('Could not remove auth directory:', error);
    }

    return res.json({
      success: true,
      message: `${deletedCount} arquivos de autenticação removidos. Gere um novo QR code.`,
      deletedFiles: deletedCount,
    });
  } catch (error: any) {
    logger.error('Error clearing auth files:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao limpar arquivos de autenticação',
    });
  }
});

/**
 * GET /api/whatsapp/groups
 * List all WhatsApp groups (to help user find group ID)
 */
router.get('/groups', async (_req, res) => {
  try {
    const service = getWhatsAppService();

    if (!service.isReady()) {
      return res.json({
        success: false,
        error: 'WhatsApp não está conectado. Conecte primeiro antes de listar grupos.',
        groups: [],
      });
    }


    try {
      const groups = await service.listGroups();
      return res.json({
        success: true,
        groups: groups,
        count: groups.length
      });
    } catch (error: any) {
      return res.json({
        success: false,
        error: error.message || 'Erro ao listar grupos',
        groups: [],
        help: 'Para obter o ID do grupo: 1) Adicione o bot ao grupo, 2) Envie uma mensagem no grupo, 3) Verifique os logs do backend para ver o ID do grupo',
      });
    }
  } catch (error: any) {
    logger.error('Error listing WhatsApp groups:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao listar grupos',
      groups: [],
    });
  }
});

// ========================================
// WhatsApp Status (Stories) Routes
// ========================================

/**
 * POST /api/whatsapp/status-post/text
 * Post a text status (story)
 */
router.post('/status-post/text', async (req, res) => {
  try {
    const { text, backgroundColor, font } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'O campo "text" é obrigatório',
      });
    }

    const service = getWhatsAppService();

    if (!service.isReady()) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp não está conectado. Escaneie o QR code primeiro.',
      });
    }

    // Check if service supports status posting
    if (typeof (service as any).postTextStatus !== 'function') {
      return res.status(400).json({
        success: false,
        error: 'Status posting não é suportado pelo serviço WhatsApp atual.',
      });
    }

    const success = await (service as any).postTextStatus(text, backgroundColor, font);

    if (success) {
      return res.json({
        success: true,
        message: 'Status de texto publicado com sucesso!',
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Falha ao publicar status. Verifique os logs.',
      });
    }
  } catch (error: any) {
    logger.error('Error posting WhatsApp text status:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao publicar status de texto',
    });
  }
});

/**
 * POST /api/whatsapp/status-post/image
 * Post an image status (story)
 */
router.post('/status-post/image', async (req, res) => {
  try {
    const { imageUrl, caption } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'O campo "imageUrl" é obrigatório',
      });
    }

    const service = getWhatsAppService();

    if (!service.isReady()) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp não está conectado. Escaneie o QR code primeiro.',
      });
    }

    if (typeof (service as any).postImageStatus !== 'function') {
      return res.status(400).json({
        success: false,
        error: 'Status posting não é suportado pelo serviço WhatsApp atual.',
      });
    }

    const success = await (service as any).postImageStatus(imageUrl, caption);

    if (success) {
      return res.json({
        success: true,
        message: 'Status de imagem publicado com sucesso!',
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Falha ao publicar status. Verifique os logs.',
      });
    }
  } catch (error: any) {
    logger.error('Error posting WhatsApp image status:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao publicar status de imagem',
    });
  }
});

/**
 * POST /api/whatsapp/status-post/video
 * Post a video status (story)
 */
router.post('/status-post/video', async (req, res) => {
  try {
    const { videoUrl, caption } = req.body;

    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        error: 'O campo "videoUrl" é obrigatório',
      });
    }

    const service = getWhatsAppService();

    if (!service.isReady()) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp não está conectado. Escaneie o QR code primeiro.',
      });
    }

    if (typeof (service as any).postVideoStatus !== 'function') {
      return res.status(400).json({
        success: false,
        error: 'Status posting não é suportado pelo serviço WhatsApp atual.',
      });
    }

    const success = await (service as any).postVideoStatus(videoUrl, caption);

    if (success) {
      return res.json({
        success: true,
        message: 'Status de vídeo publicado com sucesso!',
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Falha ao publicar status. Verifique os logs.',
      });
    }
  } catch (error: any) {
    logger.error('Error posting WhatsApp video status:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao publicar status de vídeo',
    });
  }
});

export default router;
