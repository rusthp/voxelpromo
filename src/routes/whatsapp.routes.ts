import { Router } from 'express';
import { WhatsAppServiceBaileys } from '../services/messaging/WhatsAppServiceBaileys';
import { logger } from '../utils/logger';
import { existsSync, readdirSync, unlinkSync, rmdirSync } from 'fs';
import { join } from 'path';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Store service instances per user
const userServices = new Map<string, WhatsAppServiceBaileys>();

/**
 * Get or create WhatsApp service for user
 */
async function getServiceForUser(userId: string): Promise<WhatsAppServiceBaileys> {
  if (userServices.has(userId)) {
    return userServices.get(userId)!;
  }

  const service = await WhatsAppServiceBaileys.createForUser(userId);
  userServices.set(userId, service);
  return service;
}

/**
 * GET /api/whatsapp/qr
 * Get current QR code
 */
router.get('/qr', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const service = await getServiceForUser(userId);
    const qrCode = service.getQRCode();

    if (qrCode) {
      const qrHash = `${qrCode.substring(0, 20)}...${qrCode.substring(qrCode.length - 20)}`;

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
        // ... (Return new QR logic)
        // Get Data URL if available
        let qrCodeDataURL: string | undefined;
        if (typeof (service as any).getQRCodeDataURL === 'function') {
          qrCodeDataURL = (service as any).getQRCodeDataURL();
        }

        return res.json({
          success: true,
          qrCode: qrCodeAfterInit,
          qrCodeDataURL,
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
router.get('/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const service = await getServiceForUser(userId);
    const isReady = service.isReady();
    const qrCode = service.getQRCode();

    // Get additional connection info if available
    let connectionInfo: any = null;
    if (typeof (service as any).getConnectionInfo === 'function') {
      connectionInfo = (service as any).getConnectionInfo();
    }

    // Check for auth files (user specific)
    const authFolder = `auth_info_baileys_${userId}`;
    const authDir = join(process.cwd(), authFolder);
    const hasAuthFiles = existsSync(authDir);

    // Get QR code timestamp and Data URL from connection info if available
    const qrCodeTimestamp = connectionInfo?.qrCodeTimestamp || (qrCode ? Date.now() : 0);
    const qrCodeDataURL = connectionInfo?.qrCodeDataURL;

    return res.json({
      success: true,
      isReady: isReady,
      hasQRCode: !!qrCode,
      qrCode: qrCode || null,
      qrCodeDataURL: qrCodeDataURL || null,
      hasAuthFiles: hasAuthFiles,
      connectionInfo: connectionInfo,
      timestamp: Date.now(),
      qrCodeTimestamp: qrCodeTimestamp,
      message: isReady
        ? 'WhatsApp conectado e pronto!'
        : qrCode
          ? 'QR Code disponível. Escaneie para conectar.'
          : hasAuthFiles
            ? 'Arquivos de autenticação encontrados. Tente inicializar.'
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
 * Force initialization
 */
router.post('/initialize', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const service = await getServiceForUser(userId);

    // Force re-initialization
    await service.initialize(true); // Assuming force=true works or updated service handles it

    // Wait for QR
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const qrCode = service.getQRCode();
    const isReady = service.isReady();

    let qrCodeDataURL: string | undefined;
    if (typeof (service as any).getQRCodeDataURL === 'function') {
      qrCodeDataURL = (service as any).getQRCodeDataURL();
    }

    return res.json({
      success: true,
      message: isReady
        ? 'WhatsApp conectado!'
        : qrCode
          ? 'QR Code gerado!'
          : 'Inicializando...',
      qrCode,
      qrCodeDataURL,
      isReady
    });
  } catch (error: any) {
    logger.error('Error initializing WhatsApp:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/whatsapp/auth
 * Clear authentication
 */
router.delete('/auth', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const authFolder = `auth_info_baileys_${userId}`;
    const authDir = join(process.cwd(), authFolder);

    if (!existsSync(authDir)) {
      return res.json({ success: true, message: 'Nenhum arquivo de autenticação encontrado.' });
    }

    const files = readdirSync(authDir);
    let deletedCount = 0;
    for (const file of files) {
      try {
        unlinkSync(join(authDir, file));
        deletedCount++;
      } catch (e) {
        // ignore error
      }
    }
    try {
      rmdirSync(authDir);
    } catch (e) {
      // ignore error
    }

    // Also reset service instance
    if (userServices.has(userId)) {
      // Ideally close connection first
      userServices.delete(userId);
    }

    return res.json({ success: true, message: 'Autenticação limpa.', deletedFiles: deletedCount });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/whatsapp/test
 * Send test message
 */
router.post('/test', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const service = await getServiceForUser(userId);

    if (!service.isReady()) {
      return res.status(400).json({ success: false, error: 'WhatsApp não conectado.' });
    }

    const testOffer = {
      title: '🔔 Teste VoxelPromo',
      description: 'Teste de envio multi-tenant',
      currentPrice: 0,
      originalPrice: 0,
      discountPercentage: 0,
      affiliateUrl: '',
      imageUrl: '',
      source: 'test',
      aiGeneratedPost: '🔔 *Teste VoxelPromo*\n\n✅ Sistema Multi-Tenant Operacional!',
      userId: userId // Important for context
    };

    const success = await service.sendOffer(testOffer as any);
    return res.json({ success, message: success ? 'Enviado!' : 'Falha ao enviar.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/whatsapp/groups
 */
router.get('/groups', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const service = await getServiceForUser(userId);

    if (!service.isReady()) {
      return res.json({ success: false, groups: [], error: 'Não conectado' });
    }

    try {
      const groups = await service.listGroups();
      return res.json({ success: true, groups, count: groups.length });
    } catch (e: any) {
      return res.json({ success: false, error: e.message, groups: [] });
    }
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
