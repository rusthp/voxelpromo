import { Router, Request, Response } from 'express';
import { getEmailService } from '../services/EmailService';
import { logger } from '../utils/logger';
import { validate } from '../middleware/validate';
import { contactFormSchema } from '../validation/contact.validation';

const router = Router();

/**
 * @swagger
 * /api/contact:
 *   post:
 *     summary: Send a contact form message
 *     tags: [Contact]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - subject
 *               - message
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               subject:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message sent successfully
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Failed to send message
 */
router.post('/', validate(contactFormSchema), async (req: Request, res: Response) => {
  try {
    // Data already validated and sanitized by middleware
    const { name, email, subject, message } = req.body;

    const emailService = getEmailService();

    if (!emailService.isConfigured()) {
      logger.error('Email service not configured for contact form');
      return res.status(500).json({
        success: false,
        error: 'Serviço de email não configurado',
      });
    }

    // Build the email HTML
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a;">
  <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%); border-radius: 16px; overflow: hidden; margin-top: 20px; margin-bottom: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #00d4ff 0%, #ff006e 50%, #ff8c00 100%); padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">📬 Nova Mensagem de Contato</h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 30px;">
      <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <h3 style="color: #00d4ff; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase;">De:</h3>
        <p style="color: #ffffff; margin: 0; font-size: 16px;"><strong>${name}</strong></p>
        <p style="color: #a0a0a0; margin: 5px 0 0 0; font-size: 14px;">${email}</p>
      </div>
      
      <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <h3 style="color: #ff006e; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase;">Assunto:</h3>
        <p style="color: #ffffff; margin: 0; font-size: 16px;">${subject}</p>
      </div>
      
      <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px;">
        <h3 style="color: #ff8c00; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase;">Mensagem:</h3>
        <p style="color: #ffffff; margin: 0; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background: rgba(0,0,0,0.3); padding: 20px; text-align: center;">
      <p style="color: #666; margin: 0; font-size: 12px;">
        Enviado através do formulário de contato do VoxelPromo
      </p>
      <p style="color: #666; margin: 8px 0 0 0; font-size: 12px;">
        Para responder, clique em "Responder" ou envie para: ${email}
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const textVersion = `
Nova Mensagem de Contato - VoxelPromo
=====================================

De: ${name}
Email: ${email}

Assunto: ${subject}

Mensagem:
${message}

---
Enviado através do formulário de contato do VoxelPromo.
Para responder, envie email para: ${email}
    `;

    // Get destination email from env or use default
    const contactEmail = process.env.CONTACT_EMAIL || 'contato@voxelpromo.com';

    // Send the email
    const sent = await emailService.sendEmail({
      to: contactEmail,
      subject: `[Contato VoxelPromo] ${subject}`,
      html,
      text: textVersion,
    });

    if (sent) {
      logger.info(`📬 Contact form message sent from ${email}: ${subject}`);
      return res.json({
        success: true,
        message: 'Mensagem enviada com sucesso! Responderemos em até 24 horas úteis.',
      });
    } else {
      logger.error(`Failed to send contact form from ${email}`);
      return res.status(500).json({
        success: false,
        error: 'Falha ao enviar mensagem. Tente novamente mais tarde.',
      });
    }
  } catch (error: any) {
    logger.error('Contact form error:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao processar sua mensagem',
    });
  }
});

export const contactRoutes = router;
