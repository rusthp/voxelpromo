import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { logger } from '../utils/logger';

/**
 * Email Service with dual provider support:
 * - SMTP (Titan/HostGator, Gmail, etc.) - Primary for production
 * - Resend API - Fallback or alternative
 *
 * Priority: SMTP > Resend
 *
 * Environment variables:
 * - EMAIL_PROVIDER: 'smtp' or 'resend' (default: auto-detect)
 * - EMAIL_HOST: SMTP host (e.g., smtp.titan.email)
 * - EMAIL_PORT: SMTP port (default: 587)
 * - EMAIL_SECURE: Use TLS (default: false for STARTTLS)
 * - EMAIL_USER: SMTP username
 * - EMAIL_PASS: SMTP password
 * - EMAIL_FROM: Sender address
 * - RESEND_API_KEY: Resend API key (fallback)
 */
class EmailService {
  private smtpTransporter: nodemailer.Transporter | null = null;
  private resend: Resend | null = null;
  private from: string;
  private provider: 'smtp' | 'resend' | null = null;

  constructor() {
    this.from = process.env.EMAIL_FROM || 'VoxelPromo <contato@voxelpromo.com>';
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Try SMTP first (preferred for Titan/HostGator)
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const port = parseInt(process.env.EMAIL_PORT || '587');
        const isSecure = process.env.EMAIL_SECURE === 'true' || port === 465;

        this.smtpTransporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: port,
          secure: isSecure, // true for 465, false for 587
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
          authMethod: 'LOGIN', // Use LOGIN instead of PLAIN for Titan
          tls: {
            rejectUnauthorized: false,
            minVersion: 'TLSv1.2', // Modern TLS
          },
          debug: process.env.NODE_ENV !== 'production',
          logger: process.env.NODE_ENV !== 'production',
        });

        this.provider = 'smtp';
        logger.info('✉️ EmailService initialized with SMTP', {
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT || '587',
          user: process.env.EMAIL_USER?.substring(0, 5) + '...',
        });
      } catch (error) {
        logger.error('Failed to initialize SMTP:', error);
      }
    }

    // Try Resend as fallback
    if (!this.provider && process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
      this.provider = 'resend';
      logger.info('✉️ EmailService initialized with Resend');
    }

    // No provider configured
    if (!this.provider) {
      if (process.env.NODE_ENV === 'production') {
        logger.error('🔴 CRITICAL: No email provider configured in production!');
        logger.error('   Configure EMAIL_HOST/USER/PASS (SMTP) or RESEND_API_KEY');
      } else {
        logger.warn('⚠️ No email provider configured. Email features disabled.');
        logger.warn('   For Titan SMTP: Set EMAIL_HOST, EMAIL_USER, EMAIL_PASS');
      }
    }
  }

  /**
   * Check if email service is configured
   */
  isConfigured(): boolean {
    return this.provider !== null;
  }

  /**
   * Get current provider name
   */
  getProvider(): string {
    return this.provider || 'none';
  }

  /**
   * Verify SMTP connection (useful for testing)
   */
  async verifyConnection(): Promise<boolean> {
    if (this.smtpTransporter) {
      try {
        await this.smtpTransporter.verify();
        logger.info('✅ SMTP connection verified');
        return true;
      } catch (error) {
        logger.error('❌ SMTP connection failed:', error);
        return false;
      }
    }
    return this.resend !== null;
  }

  /**
   * Send a generic email
   */
  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<boolean> {
    if (!this.provider) {
      logger.warn('Email not sent: No provider configured');
      return false;
    }

    try {
      if (this.provider === 'smtp' && this.smtpTransporter) {
        // Send via SMTP (Titan/HostGator)
        await this.smtpTransporter.sendMail({
          from: this.from,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        });
        logger.info(`📧 Email sent via SMTP to ${options.to}: ${options.subject}`);
        return true;
      } else if (this.provider === 'resend' && this.resend) {
        // Send via Resend API
        const result = await this.resend.emails.send({
          from: this.from,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        });

        if (result.error) {
          logger.error('Failed to send email via Resend:', result.error);
          return false;
        }
        logger.info(`📧 Email sent via Resend to ${options.to}: ${options.subject}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error sending email:', error);
      return false;
    }
  }

  /**
   * Send subscription expiring reminder (D-5)
   */
  async sendExpirationReminder5Days(
    to: string,
    userName: string,
    planName: string,
    expiresAt: Date
  ): Promise<boolean> {
    const formattedDate = expiresAt.toLocaleDateString('pt-BR');

    return this.sendEmail({
      to,
      subject: `⏰ Sua assinatura VoxelPromo expira em 5 dias`,
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #06b6d4;">VoxelPromo</h1>
                    <h2>Olá, ${userName}! 👋</h2>
                    
                    <p>Sua assinatura do plano <strong>${planName}</strong> expira em <strong>${formattedDate}</strong> (5 dias).</p>
                    
                    <p>Renove agora para continuar aproveitando todos os benefícios:</p>
                    <ul>
                        <li>✅ Publicação automática de ofertas</li>
                        <li>✅ Integração com todos os canais</li>
                        <li>✅ Geração de posts com IA</li>
                    </ul>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.FRONTEND_URL || 'https://voxelpromo.com'}/pricing" 
                           style="background-color: #06b6d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                            Renovar Agora
                        </a>
                    </div>
                    
                    <p style="color: #666; font-size: 12px;">
                        Se você tiver dúvidas, responda este email ou acesse nosso suporte.
                    </p>
                </div>
            `,
      text: `Olá ${userName}! Sua assinatura do plano ${planName} expira em ${formattedDate}. Acesse ${process.env.FRONTEND_URL}/pricing para renovar.`,
    });
  }

  /**
   * Send subscription expiring tomorrow reminder (D-1)
   */
  async sendExpirationReminderTomorrow(
    to: string,
    userName: string,
    planName: string
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `🚨 URGENTE: Sua assinatura VoxelPromo expira AMANHÃ!`,
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #06b6d4;">VoxelPromo</h1>
                    <h2>Olá, ${userName}! ⚠️</h2>
                    
                    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                        <strong>Sua assinatura do plano ${planName} expira AMANHÃ!</strong>
                    </div>
                    
                    <p>Após amanhã, você perderá acesso a:</p>
                    <ul>
                        <li>❌ Publicação automática</li>
                        <li>❌ Geração de posts com IA</li>
                        <li>❌ Todas as integrações premium</li>
                    </ul>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.FRONTEND_URL || 'https://voxelpromo.com'}/pricing" 
                           style="background-color: #ef4444; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                            🔥 Renovar Agora - Não Perca Acesso!
                        </a>
                    </div>
                    
                    <p style="color: #666; font-size: 12px;">
                        Se preferir não renovar, seus dados serão mantidos por 30 dias.
                    </p>
                </div>
            `,
      text: `URGENTE: Olá ${userName}! Sua assinatura do plano ${planName} expira AMANHÃ! Acesse ${process.env.FRONTEND_URL}/pricing para renovar e não perder acesso.`,
    });
  }

  /**
   * Send subscription expired notification (D+1)
   */
  async sendExpiredNotification(to: string, userName: string, planName: string): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `😢 Sua assinatura VoxelPromo expirou`,
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #06b6d4;">VoxelPromo</h1>
                    <h2>Olá, ${userName}!</h2>
                    
                    <p>Infelizmente sua assinatura do plano <strong>${planName}</strong> expirou.</p>
                    
                    <p>Não se preocupe! Seus dados e configurações foram mantidos. Você pode reativar sua conta a qualquer momento.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.FRONTEND_URL || 'https://voxelpromo.com'}/pricing" 
                           style="background-color: #06b6d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                            Reativar Minha Conta
                        </a>
                    </div>
                    
                    <p>Enquanto isso, suas automações estão pausadas e nenhum post será publicado.</p>
                    
                    <p style="color: #666; font-size: 12px;">
                        Sentimos sua falta! Volte quando quiser. 💙
                    </p>
                </div>
            `,
      text: `Olá ${userName}! Sua assinatura do plano ${planName} expirou. Acesse ${process.env.FRONTEND_URL}/pricing para reativar sua conta.`,
    });
  }

  /**
   * Send subscription activated confirmation
   */
  async sendSubscriptionActivated(
    to: string,
    userName: string,
    planName: string,
    nextBillingDate?: Date
  ): Promise<boolean> {
    const formattedDate = nextBillingDate?.toLocaleDateString('pt-BR') || 'em 30 dias';

    return this.sendEmail({
      to,
      subject: `🎉 Sua assinatura VoxelPromo foi ativada!`,
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #06b6d4;">VoxelPromo</h1>
                    <h2>Parabéns, ${userName}! 🎉</h2>
                    
                    <p>Sua assinatura do plano <strong>${planName}</strong> foi ativada com sucesso!</p>
                    
                    <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
                        <strong>✅ Você agora tem acesso completo a:</strong>
                        <ul style="margin: 10px 0;">
                            <li>Publicação automática de ofertas</li>
                            <li>Geração de posts com IA</li>
                            <li>Todas as integrações premium</li>
                            <li>Suporte prioritário</li>
                        </ul>
                    </div>
                    
                    <p><strong>Próxima cobrança:</strong> ${formattedDate}</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.FRONTEND_URL || 'https://voxelpromo.com'}/dashboard" 
                           style="background-color: #06b6d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                            Acessar Dashboard
                        </a>
                    </div>
                    
                    <p style="color: #666; font-size: 12px;">
                        Bem-vindo ao VoxelPromo! 🚀
                    </p>
                </div>
            `,
      text: `Parabéns ${userName}! Sua assinatura do plano ${planName} foi ativada. Próxima cobrança: ${formattedDate}. Acesse ${process.env.FRONTEND_URL}/dashboard para começar.`,
    });
  }

  /**
   * Send subscription cancelled confirmation
   */
  async sendSubscriptionCancelled(
    to: string,
    userName: string,
    planName: string,
    accessUntil: Date
  ): Promise<boolean> {
    const formattedDate = accessUntil.toLocaleDateString('pt-BR');

    return this.sendEmail({
      to,
      subject: `📝 Confirmação de cancelamento - VoxelPromo`,
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #06b6d4;">VoxelPromo</h1>
                    <h2>Olá, ${userName}!</h2>
                    
                    <p>Confirmamos o cancelamento da sua assinatura do plano <strong>${planName}</strong>.</p>
                    
                    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                        <strong>📅 Você ainda tem acesso até ${formattedDate}</strong>
                        <p style="margin: 5px 0 0 0; font-size: 14px;">Após essa data, suas automações serão pausadas automaticamente.</p>
                    </div>
                    
                    <p>Mudou de ideia? Você pode reativar sua assinatura a qualquer momento antes de ${formattedDate}.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.FRONTEND_URL || 'https://voxelpromo.com'}/settings?tab=subscription" 
                           style="background-color: #06b6d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                            Reativar Assinatura
                        </a>
                    </div>
                    
                    <p style="color: #666; font-size: 12px;">
                        Sentiremos sua falta! Esperamos vê-lo em breve. 💙
                    </p>
                </div>
            `,
      text: `Olá ${userName}! Sua assinatura do plano ${planName} foi cancelada. Você ainda tem acesso até ${formattedDate}. Acesse ${process.env.FRONTEND_URL}/settings?tab=subscription para reativar.`,
    });
  }

  /**
   * Send password reset email
   * Token expires in 15 minutes for security
   */
  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `🔐 Redefinição de Senha - VoxelPromo`,
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #06b6d4;">VoxelPromo</h1>
                    <h2>Redefinição de Senha</h2>
                    
                    <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
                    
                    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                        <strong>⏱️ Este link expira em 15 minutos.</strong>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" 
                           style="background-color: #06b6d4; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                            Redefinir Minha Senha
                        </a>
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">
                        Ou copie e cole este link no seu navegador:<br>
                        <a href="${resetUrl}" style="color: #06b6d4; word-break: break-all;">${resetUrl}</a>
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    
                    <p style="color: #999; font-size: 12px;">
                        <strong>Se você não solicitou esta redefinição, ignore este e-mail.</strong><br>
                        Sua senha não será alterada a menos que você clique no link acima.
                    </p>
                </div>
            `,
      text: `Redefinição de Senha VoxelPromo\n\nRecebemos uma solicitação para redefinir sua senha.\n\nClique no link abaixo (válido por 15 minutos):\n${resetUrl}\n\nSe você não solicitou, ignore este e-mail.`,
    });
  }

  /**
   * Send password changed notification (security)
   */
  async sendPasswordChangedNotification(to: string, userName: string): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `🔒 Sua senha foi alterada - VoxelPromo`,
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #06b6d4;">VoxelPromo</h1>
                    <h2>Olá, ${userName}!</h2>
                    
                    <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
                        <strong>✅ Sua senha foi alterada com sucesso</strong>
                    </div>
                    
                    <p>Esta é uma confirmação de que a senha da sua conta VoxelPromo foi alterada.</p>
                    
                    <p style="color: #666;">
                        <strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}<br>
                    </p>
                    
                    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                        <strong>⚠️ Se você não fez essa alteração:</strong>
                        <p style="margin: 5px 0 0 0; font-size: 14px;">
                            Acesse sua conta imediatamente e altere sua senha.<br>
                            Entre em contato com nosso suporte se precisar de ajuda.
                        </p>
                    </div>
                    
                    <p style="color: #666; font-size: 12px;">
                        Este e-mail foi enviado automaticamente por segurança.
                    </p>
                </div>
            `,
      text: `Olá ${userName}! Sua senha VoxelPromo foi alterada em ${new Date().toLocaleString('pt-BR')}. Se você não fez essa alteração, entre em contato com nosso suporte imediatamente.`,
    });
  }

  /**
   * Send email verification (clean design like Visor)
   */
  async sendVerificationEmail(
    to: string,
    userName: string,
    verificationUrl: string
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `Verifique seu email - VoxelPromo`,
      html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td align="center" style="padding: 40px 20px;">
                                <table role="presentation" style="max-width: 480px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                                    <!-- Logo -->
                                    <tr>
                                        <td align="center" style="padding: 40px 40px 20px 40px;">
                                            <div style="display: inline-flex; align-items: center; gap: 8px;">
                                                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                                                    <span style="color: white; font-weight: bold; font-size: 20px;">V</span>
                                                </div>
                                                <span style="font-size: 24px; font-weight: 600; color: #1a1a2e;">VoxelPromo</span>
                                            </div>
                                        </td>
                                    </tr>
                                    
                                    <!-- Content -->
                                    <tr>
                                        <td style="padding: 0 40px;">
                                            <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 600; color: #1a1a2e;">
                                                Olá, ${userName}!
                                            </h1>
                                            <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #4a5568;">
                                                Obrigado por se cadastrar no <strong>VoxelPromo</strong>. Para completar seu cadastro e começar a usar o app, precisamos verificar seu email.
                                            </p>
                                            <p style="margin: 0 0 24px 0; font-size: 15px; color: #4a5568;">
                                                Clique no botão abaixo para verificar sua conta:
                                            </p>
                                        </td>
                                    </tr>
                                    
                                    <!-- Button -->
                                    <tr>
                                        <td align="center" style="padding: 0 40px 24px 40px;">
                                            <a href="${verificationUrl}" 
                                               style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
                                                Verificar Email
                                            </a>
                                        </td>
                                    </tr>
                                    
                                    <!-- Warning -->
                                    <tr>
                                        <td style="padding: 0 40px 24px 40px;">
                                            <div style="background-color: #fef9c3; border-left: 4px solid #eab308; padding: 12px 16px; border-radius: 0 8px 8px 0;">
                                                <p style="margin: 0; font-size: 13px; color: #854d0e;">
                                                    <strong>Atenção:</strong> Este link expira em 24 horas. Se você não solicitou este email, pode ignorá-lo com segurança.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                    
                                    <!-- Fallback Link -->
                                    <tr>
                                        <td style="padding: 0 40px 32px 40px;">
                                            <p style="margin: 0 0 8px 0; font-size: 13px; color: #718096;">
                                                Se o botão não funcionar, copie e cole este link no seu navegador:
                                            </p>
                                            <p style="margin: 0; font-size: 12px; word-break: break-all;">
                                                <a href="${verificationUrl}" style="color: #06b6d4;">${verificationUrl}</a>
                                            </p>
                                        </td>
                                    </tr>
                                    
                                    <!-- Footer -->
                                    <tr>
                                        <td style="padding: 24px 40px; border-top: 1px solid #e2e8f0;">
                                            <p style="margin: 0 0 8px 0; font-size: 13px; color: #718096;">
                                                Se tiver qualquer dúvida, é só responder este email. Estou aqui para ajudar!
                                            </p>
                                            <p style="margin: 0; font-size: 13px; font-weight: 600; color: #1a1a2e;">
                                                Equipe VoxelPromo
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Copyright -->
                                <p style="margin: 24px 0 0 0; font-size: 12px; color: #a0aec0;">
                                    © ${new Date().getFullYear()} VoxelPromo. Todos os direitos reservados.
                                </p>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `,
      text: `Olá ${userName}! Obrigado por se cadastrar no VoxelPromo. Verifique seu email acessando: ${verificationUrl}. Este link expira em 24 horas.`,
    });
  }
}

// Singleton instance
let emailServiceInstance: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
  }
  return emailServiceInstance;
}

export { EmailService };
