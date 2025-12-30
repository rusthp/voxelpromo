import axios from 'axios';
import { Offer } from '../../types';
import { logger } from '../../utils/logger';
import { AIService } from '../ai/AIService';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Instagram Service - Meta Graph API Integration
 * Provides automation for Instagram messaging via official Meta API
 *
 * Requirements:
 * - Instagram Business or Creator account
 * - Facebook Page linked to Instagram account
 * - Meta Developer App with permissions:
 *   - instagram_basic
 *   - instagram_manage_messages
 *   - instagram_manage_comments
 *   - pages_manage_metadata
 */

// Types for Instagram API
interface InstagramWebhookPayload {
    object: 'instagram';
    entry: InstagramWebhookEntry[];
}

interface InstagramWebhookEntry {
    id: string;
    time: number;
    messaging?: InstagramMessagingEvent[];
    changes?: InstagramChangeEvent[];
}

interface InstagramMessagingEvent {
    sender: { id: string };
    recipient: { id: string };
    timestamp: number;
    message?: {
        mid: string;
        text?: string;
        attachments?: { type: string; payload: { url: string } }[];
    };
    postback?: {
        payload: string;
    };
}

interface InstagramChangeEvent {
    field: string;
    value: {
        id: string;
        text?: string;
        from?: { id: string; username: string };
        media?: { id: string };
    };
}

interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in?: number;
}

interface InstagramSettings {
    enabled: boolean;
    autoReplyDM: boolean;
    welcomeMessage: string;
    keywordReplies: { [keyword: string]: string };
}

interface InstagramAccount {
    id: string;
    username: string;
    name?: string;
    profile_picture_url?: string;
}

export class InstagramService {
    private aiService: AIService | null = null;

    // OAuth2 credentials
    private appId: string | null = null;
    private appSecret: string | null = null;
    private accessToken: string | null = null;
    private pageAccessToken: string | null = null;
    private pageId: string | null = null;
    private igUserId: string | null = null;
    private webhookVerifyToken: string | null = null;

    // Configurable settings
    private settings: InstagramSettings = {
        enabled: true,
        autoReplyDM: true,
        welcomeMessage: 'Olá! 👋 Obrigado por entrar em contato!\n\nConfira nossas melhores ofertas com descontos imperdíveis! 🔥\n\nDigite "ofertas" para ver as promoções mais recentes.',
        keywordReplies: {
            'ofertas': 'Buscando as melhores ofertas para você... 🔍',
            'promoções': 'Buscando as melhores promoções para você... 🔍',
            'desconto': 'Confira nossos melhores descontos! 💰',
        },
    };

    // API configuration
    private readonly apiVersion = 'v21.0';
    private readonly graphApiBase = 'https://graph.facebook.com';

    // Rate limiting
    private messagesSent = 0;
    private lastHourReset = Date.now();
    private readonly MAX_MESSAGES_PER_HOUR = 200; // Meta rate limit 2024

    constructor() {
        this.loadCredentials();
    }

    /**
     * Load credentials from config.json or environment
     */
    private loadCredentials(): void {
        try {
            const configPath = join(process.cwd(), 'config.json');
            if (existsSync(configPath)) {
                const config = JSON.parse(readFileSync(configPath, 'utf-8'));
                if (config.instagram) {
                    this.appId = config.instagram.appId || process.env.INSTAGRAM_APP_ID || null;
                    this.appSecret = config.instagram.appSecret || process.env.INSTAGRAM_APP_SECRET || null;
                    this.accessToken = config.instagram.accessToken || process.env.INSTAGRAM_ACCESS_TOKEN || null;
                    this.pageAccessToken = config.instagram.pageAccessToken || null;
                    this.pageId = config.instagram.pageId || process.env.INSTAGRAM_PAGE_ID || null;
                    this.igUserId = config.instagram.igUserId || process.env.INSTAGRAM_IG_USER_ID || null;
                    this.webhookVerifyToken = config.instagram.webhookVerifyToken || process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || null;

                    // Load settings
                    if (config.instagram.settings) {
                        this.settings = {
                            ...this.settings,
                            ...config.instagram.settings,
                        };
                    } else {
                        // Backward compatibility - load individual fields
                        if (typeof config.instagram.enabled === 'boolean') {
                            this.settings.enabled = config.instagram.enabled;
                        }
                        if (typeof config.instagram.autoReplyDM === 'boolean') {
                            this.settings.autoReplyDM = config.instagram.autoReplyDM;
                        }
                        if (config.instagram.welcomeMessage) {
                            this.settings.welcomeMessage = config.instagram.welcomeMessage;
                        }
                        if (config.instagram.keywordReplies) {
                            this.settings.keywordReplies = config.instagram.keywordReplies;
                        }
                    }
                }
            }

            // Fallback to environment variables
            this.appId = this.appId || process.env.INSTAGRAM_APP_ID || null;
            this.appSecret = this.appSecret || process.env.INSTAGRAM_APP_SECRET || null;
            this.accessToken = this.accessToken || process.env.INSTAGRAM_ACCESS_TOKEN || null;
            this.webhookVerifyToken = this.webhookVerifyToken || process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || null;

            if (this.appId && this.appSecret) {
                logger.info('✅ Instagram configured - credentials loaded');
            } else {
                logger.debug('⚠️ Instagram not fully configured (missing App ID or App Secret)');
            }
        } catch (error: any) {
            logger.error(`Error loading Instagram credentials: ${error.message}`);
        }
    }


    /**
     * Check if the service is configured
     */
    isConfigured(): boolean {
        return !!(this.appId && this.appSecret);
    }

    /**
     * Check if the service is authenticated (has valid access token)
     */
    isAuthenticated(): boolean {
        return !!(this.accessToken && this.igUserId);
    }

    /**
     * Get AI service (lazy initialization)
     */
    private getAIService(): AIService {
        if (!this.aiService) {
            this.aiService = new AIService();
        }
        return this.aiService;
    }

    /**
     * Generate OAuth2 authorization URL
     * @param redirectUri The callback URL after authorization
     * @param state Optional state for CSRF protection
     */
    getAuthorizationUrl(redirectUri: string, state?: string): string {
        if (!this.appId) {
            throw new Error('Instagram App ID not configured');
        }

        const scopes = [
            'instagram_basic',
            'instagram_manage_messages',
            'instagram_manage_comments',
            'pages_manage_metadata',
            'pages_show_list',
            'business_management',
        ].join(',');

        const params = new URLSearchParams({
            client_id: this.appId,
            redirect_uri: redirectUri,
            scope: scopes,
            response_type: 'code',
            ...(state && { state }),
        });

        return `https://www.facebook.com/${this.apiVersion}/dialog/oauth?${params.toString()}`;
    }

    /**
     * Exchange authorization code for access token
     * @param code Authorization code from callback
     * @param redirectUri The same redirect URI used in authorization
     */
    async exchangeCodeForToken(code: string, redirectUri: string): Promise<TokenResponse> {
        if (!this.appId || !this.appSecret) {
            throw new Error('Instagram App credentials not configured');
        }

        try {
            // Exchange code for short-lived token
            const response = await axios.get(`${this.graphApiBase}/${this.apiVersion}/oauth/access_token`, {
                params: {
                    client_id: this.appId,
                    client_secret: this.appSecret,
                    redirect_uri: redirectUri,
                    code,
                },
            });

            const shortLivedToken = response.data.access_token;

            // Exchange for long-lived token
            const longLivedResponse = await axios.get(`${this.graphApiBase}/${this.apiVersion}/oauth/access_token`, {
                params: {
                    grant_type: 'fb_exchange_token',
                    client_id: this.appId,
                    client_secret: this.appSecret,
                    fb_exchange_token: shortLivedToken,
                },
            });

            this.accessToken = longLivedResponse.data.access_token;

            // Get Page Access Token and Instagram Business Account ID
            await this.fetchPageAndInstagramIds();

            // Save to config
            await this.saveCredentials();

            logger.info('✅ Instagram OAuth completed successfully');

            return {
                access_token: this.accessToken!,
                token_type: 'Bearer',
                expires_in: longLivedResponse.data.expires_in,
            };
        } catch (error: any) {
            const errorMsg = error.response?.data?.error?.message || error.message;
            logger.error(`Instagram OAuth error: ${errorMsg}`);
            throw new Error(`Failed to exchange code for token: ${errorMsg}`);
        }
    }

    /**
     * Fetch Page ID and Instagram Business Account ID
     */
    private async fetchPageAndInstagramIds(): Promise<void> {
        if (!this.accessToken) {
            throw new Error('Access token not available');
        }

        try {
            // Get pages the user manages
            const pagesResponse = await axios.get(`${this.graphApiBase}/${this.apiVersion}/me/accounts`, {
                params: {
                    access_token: this.accessToken,
                    fields: 'id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}',
                },
            });

            const pages = pagesResponse.data.data;
            if (!pages || pages.length === 0) {
                throw new Error('No Facebook Pages found. Please create a Page and link it to your Instagram Business account.');
            }

            // Find a page with Instagram Business Account
            const pageWithInstagram = pages.find((p: any) => p.instagram_business_account);
            if (!pageWithInstagram) {
                throw new Error('No Instagram Business Account linked to any Page. Please link your Instagram Business account to a Facebook Page.');
            }

            this.pageId = pageWithInstagram.id;
            this.pageAccessToken = pageWithInstagram.access_token;
            this.igUserId = pageWithInstagram.instagram_business_account.id;

            logger.info(`✅ Instagram account found: ${pageWithInstagram.instagram_business_account.username} (ID: ${this.igUserId})`);
        } catch (error: any) {
            const errorMsg = error.response?.data?.error?.message || error.message;
            logger.error(`Error fetching Instagram account: ${errorMsg}`);
            throw new Error(errorMsg);
        }
    }

    /**
     * Save credentials to config.json
     */
    private async saveCredentials(): Promise<void> {
        try {
            const configPath = join(process.cwd(), 'config.json');
            let config: any = {};

            if (existsSync(configPath)) {
                config = JSON.parse(readFileSync(configPath, 'utf-8'));
            }

            config.instagram = {
                ...config.instagram,
                appId: this.appId,
                appSecret: this.appSecret,
                accessToken: this.accessToken,
                pageAccessToken: this.pageAccessToken,
                pageId: this.pageId,
                igUserId: this.igUserId,
                webhookVerifyToken: this.webhookVerifyToken,
            };

            writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
            logger.debug('Instagram credentials saved to config.json');
        } catch (error: any) {
            logger.error(`Error saving Instagram credentials: ${error.message}`);
        }
    }

    /**
     * Get Instagram account info
     */
    async getAccountInfo(): Promise<InstagramAccount | null> {
        if (!this.igUserId || !this.accessToken) {
            return null;
        }

        try {
            // Check if this is an Instagram Graph API token (starts with IGAA)
            // vs a Facebook Graph API token
            const isInstagramToken = this.accessToken.startsWith('IGAA') || this.accessToken.startsWith('IG');

            if (isInstagramToken) {
                // Use Instagram Basic Display API / Instagram Graph API
                const response = await axios.get(`https://graph.instagram.com/${this.apiVersion}/${this.igUserId}`, {
                    params: {
                        access_token: this.accessToken,
                        fields: 'id,username,account_type,media_count',
                    },
                });

                return {
                    id: response.data.id,
                    username: response.data.username,
                    name: response.data.account_type,
                };
            } else {
                // Use Facebook Graph API for Instagram Business accounts
                const response = await axios.get(`${this.graphApiBase}/${this.apiVersion}/${this.igUserId}`, {
                    params: {
                        access_token: this.accessToken,
                        fields: 'id,username,name,profile_picture_url',
                    },
                });
                return response.data;
            }
        } catch (error: any) {
            const errorData = error.response?.data?.error;
            if (errorData) {
                logger.error(`Instagram API error: ${errorData.message} (code: ${errorData.code}, type: ${errorData.type})`);
            } else {
                logger.error(`Error fetching Instagram account info: ${error.message}`);
            }
            return null;
        }
    }

    /**
     * Verify webhook challenge from Meta
     */
    verifyWebhook(mode: string, token: string, challenge: string): string | null {
        if (mode === 'subscribe' && token === this.webhookVerifyToken) {
            logger.info('✅ Instagram webhook verified');
            return challenge;
        }
        logger.warn('❌ Instagram webhook verification failed');
        return null;
    }

    /**
     * Handle incoming webhook events
     */
    async handleWebhook(payload: InstagramWebhookPayload): Promise<void> {
        if (payload.object !== 'instagram') {
            logger.debug('Ignoring non-Instagram webhook');
            return;
        }

        for (const entry of payload.entry) {
            // Handle messaging events (DMs)
            if (entry.messaging) {
                for (const event of entry.messaging) {
                    await this.handleMessagingEvent(event);
                }
            }

            // Handle change events (comments, mentions)
            if (entry.changes) {
                for (const change of entry.changes) {
                    await this.handleChangeEvent(change);
                }
            }
        }
    }

    /**
     * Handle messaging events (DMs)
     */
    private async handleMessagingEvent(event: InstagramMessagingEvent): Promise<void> {
        try {
            const senderId = event.sender.id;

            // Skip messages from our own account
            if (senderId === this.igUserId) {
                return;
            }

            // Check if auto-reply is enabled
            if (!this.settings.autoReplyDM) {
                logger.debug('Instagram auto-reply DM is disabled, skipping response');
                return;
            }

            if (event.message?.text) {
                const messageText = event.message.text.toLowerCase().trim();
                logger.info(`📨 Instagram DM received from ${senderId}: ${event.message.text.substring(0, 50)}...`);

                // Check for keyword replies first
                const keywordResponse = await this.handleKeywordReply(senderId, messageText);
                if (keywordResponse) {
                    return; // Keyword was handled
                }

                // Otherwise, send welcome message
                await this.sendWelcomeMessage(senderId);
            }
        } catch (error: any) {
            logger.error(`Error handling Instagram messaging event: ${error.message}`);
        }
    }

    /**
     * Handle keyword-based replies
     * @returns true if a keyword was matched and handled
     */
    private async handleKeywordReply(recipientId: string, messageText: string): Promise<boolean> {
        // Check each keyword
        for (const [keyword, response] of Object.entries(this.settings.keywordReplies)) {
            if (messageText.includes(keyword.toLowerCase())) {
                logger.info(`🔑 Keyword "${keyword}" detected, sending response`);

                // If keyword is "ofertas" or "promoções", fetch and send recent offers
                if (keyword === 'ofertas' || keyword === 'promoções') {
                    await this.sendDirectMessage(recipientId, response);
                    await this.sendRecentOffers(recipientId);
                } else {
                    await this.sendDirectMessage(recipientId, response);
                }
                return true;
            }
        }
        return false;
    }

    /**
     * Send recent offers to a user
     */
    private async sendRecentOffers(recipientId: string): Promise<void> {
        try {
            // Dynamic import to avoid circular dependencies
            const { OfferModel } = require('../../models/Offer'); // eslint-disable-line @typescript-eslint/no-var-requires

            const recentOffers = await OfferModel.find({ status: 'approved' })
                .sort({ createdAt: -1 })
                .limit(3)
                .lean();

            if (recentOffers.length === 0) {
                await this.sendDirectMessage(recipientId, 'No momento não temos ofertas disponíveis. Volte em breve! 😊');
                return;
            }

            for (const offer of recentOffers) {
                const message = await this.formatMessage(offer);
                await this.sendDirectMessage(recipientId, message);
                await this.delay(1500); // Delay between messages
            }
        } catch (error: any) {
            logger.error(`Error sending recent offers: ${error.message}`);
            await this.sendDirectMessage(recipientId, 'Ops! Não consegui buscar as ofertas no momento. Tente novamente mais tarde! 🙏');
        }
    }


    /**
     * Handle change events (comments, mentions)
     */
    private async handleChangeEvent(change: InstagramChangeEvent): Promise<void> {
        try {
            if (change.field === 'comments') {
                const comment = change.value;
                logger.info(`💬 Instagram comment received: ${comment.text?.substring(0, 50)}...`);

                // Could implement auto-reply to comments here
                // await this.replyToComment(comment.id, 'Obrigado pelo comentário!');
            }
        } catch (error: any) {
            logger.error(`Error handling Instagram change event: ${error.message}`);
        }
    }

    /**
     * Send a welcome message to a user
     */
    private async sendWelcomeMessage(recipientId: string): Promise<boolean> {
        return this.sendDirectMessage(recipientId, this.settings.welcomeMessage);
    }

    /**
     * Send a direct message to a user
     */
    async sendDirectMessage(recipientId: string, message: string): Promise<boolean> {
        if (!this.checkRateLimit()) {
            logger.warn('⚠️ Instagram rate limit reached, skipping message');
            return false;
        }

        if (!this.igUserId || !this.pageAccessToken) {
            logger.warn('⚠️ Instagram not authenticated');
            return false;
        }

        try {
            await axios.post(
                `${this.graphApiBase}/${this.apiVersion}/${this.igUserId}/messages`,
                {
                    recipient: { id: recipientId },
                    message: { text: message },
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.pageAccessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            this.messagesSent++;
            logger.info(`✅ Instagram DM sent to ${recipientId}`);
            return true;
        } catch (error: any) {
            const errorMsg = error.response?.data?.error?.message || error.message;
            logger.error(`❌ Error sending Instagram DM: ${errorMsg}`);
            return false;
        }
    }

    /**
     * Reply to a comment
     */
    async replyToComment(commentId: string, message: string): Promise<boolean> {
        if (!this.pageAccessToken) {
            logger.warn('⚠️ Instagram not authenticated');
            return false;
        }

        try {
            await axios.post(
                `${this.graphApiBase}/${this.apiVersion}/${commentId}/replies`,
                { message },
                {
                    headers: {
                        Authorization: `Bearer ${this.pageAccessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            logger.info(`✅ Instagram comment reply sent`);
            return true;
        } catch (error: any) {
            const errorMsg = error.response?.data?.error?.message || error.message;
            logger.error(`❌ Error replying to Instagram comment: ${errorMsg}`);
            return false;
        }
    }

    /**
     * Send offer to Instagram (via DM to recent interactors or as comment reply)
     * Note: Instagram DMs require user-initiated conversation due to 24h window
     */
    async sendOffer(offer: Offer): Promise<boolean> {
        if (!this.isAuthenticated()) {
            logger.warn('⚠️ Instagram not authenticated, skipping offer');
            return false;
        }

        if (!this.checkRateLimit()) {
            logger.warn('⚠️ Instagram rate limit reached, skipping offer');
            return false;
        }

        try {
            // Verify affiliate link before sending
            if (offer.affiliateUrl) {
                const { LinkVerifier } = require('../link/LinkVerifier'); // eslint-disable-line @typescript-eslint/no-var-requires
                const isValid = await LinkVerifier.verify(offer.affiliateUrl);
                if (!isValid) {
                    logger.warn(`🛑 Skipping Instagram offer due to invalid link: ${offer.affiliateUrl}`);
                    return false;
                }
            }

            const message = await this.formatMessage(offer);
            logger.info(`📤 Instagram offer ready: ${offer.title}`);

            // Note: Instagram DMs require user-initiated conversation
            // This method is called when we have a conversation context from webhook
            // For now, we log the prepared message
            logger.debug(`Instagram message prepared (${message.length} chars)`);

            return true;
        } catch (error: any) {
            logger.error(`❌ Error preparing Instagram offer: ${error.message}`);
            return false;
        }
    }

    /**
     * Send multiple offers
     */
    async sendOffers(offers: Offer[]): Promise<number> {
        let successCount = 0;

        for (const offer of offers) {
            const success = await this.sendOffer(offer);
            if (success) {
                successCount++;
                // Delay between messages to avoid rate limiting
                await this.delay(3000);
            }
        }

        return successCount;
    }

    /**
     * Format offer message for Instagram DM
     */
    private async formatMessage(offer: Offer): Promise<string> {
        const impactPhrase = await this.getImpactPhrase(offer);
        const priceFormatted = offer.currentPrice.toFixed(2).replace('.', ',');
        const hasDiscount = offer.discountPercentage >= 5 && offer.originalPrice > offer.currentPrice;

        const parts: string[] = [];

        // Impact phrase
        parts.push(`🔥 ${impactPhrase}!`);

        // Product title
        parts.push(`\n📦 ${offer.title}`);

        // Price
        if (hasDiscount) {
            const originalFormatted = offer.originalPrice.toFixed(2).replace('.', ',');
            parts.push(`\n💰 De R$ ${originalFormatted} por R$ ${priceFormatted}`);
            parts.push(`📉 ${offer.discountPercentage.toFixed(0)}% OFF`);
        } else {
            parts.push(`\n💰 Por apenas R$ ${priceFormatted}`);
        }

        // Coupons
        if (offer.coupons && offer.coupons.length > 0) {
            parts.push(`\n🎟️ Use o cupom: ${offer.coupons[0]}`);
        }

        // Link
        parts.push(`\n🛒 Compre aqui: ${offer.affiliateUrl}`);

        return parts.join('');
    }

    /**
     * Get impact phrase using AI or fallback
     */
    private async getImpactPhrase(offer: Offer): Promise<string> {
        try {
            const aiPhrase = await Promise.race([
                this.getAIService().generateImpactPhrase(offer),
                new Promise<string>((resolve) => {
                    setTimeout(() => resolve(''), 2000);
                }),
            ]);

            if (aiPhrase && aiPhrase.length > 0) {
                return aiPhrase;
            }
        } catch (error: any) {
            logger.debug(`AI phrase generation failed: ${error.message}`);
        }

        return this.getFallbackImpactPhrase(offer);
    }

    /**
     * Get fallback impact phrase
     */
    private getFallbackImpactPhrase(offer: Offer): string {
        const discount = offer.discountPercentage;

        if (discount >= 50) {
            const phrases = ['PROMOÇÃO IMPERDÍVEL', 'DESCONTO INSANO', 'OPORTUNIDADE ÚNICA'];
            return phrases[Math.floor(Math.random() * phrases.length)];
        }

        if (discount >= 30) {
            const phrases = ['SUPER PROMOÇÃO', 'OFERTA ESPECIAL', 'DESCONTO INCRÍVEL'];
            return phrases[Math.floor(Math.random() * phrases.length)];
        }

        if (discount >= 15) {
            return 'ÓTIMA OFERTA';
        }

        return 'OFERTA DISPONÍVEL';
    }

    /**
     * Check rate limit
     */
    private checkRateLimit(): boolean {
        const now = Date.now();
        const hourInMs = 60 * 60 * 1000;

        // Reset counter if an hour has passed
        if (now - this.lastHourReset > hourInMs) {
            this.messagesSent = 0;
            this.lastHourReset = now;
        }

        return this.messagesSent < this.MAX_MESSAGES_PER_HOUR;
    }

    /**
     * Get current rate limit status
     */
    getRateLimitStatus(): { remaining: number; total: number; resetsIn: number } {
        const now = Date.now();
        const hourInMs = 60 * 60 * 1000;
        const resetsIn = Math.max(0, hourInMs - (now - this.lastHourReset));

        return {
            remaining: Math.max(0, this.MAX_MESSAGES_PER_HOUR - this.messagesSent),
            total: this.MAX_MESSAGES_PER_HOUR,
            resetsIn: Math.ceil(resetsIn / 1000), // seconds
        };
    }

    /**
     * Send test message (for debugging)
     */
    async sendTestMessage(recipientId?: string): Promise<boolean> {
        const testMessage = `🤖 Teste do VoxelPromo\n\n✅ Instagram configurado com sucesso!\n\n📅 ${new Date().toLocaleString('pt-BR')}\n\nSe você recebeu esta mensagem, a integração está funcionando! 🎉`;

        if (recipientId) {
            return this.sendDirectMessage(recipientId, testMessage);
        }

        // Without a recipientId, we can only verify the connection
        const accountInfo = await this.getAccountInfo();
        if (accountInfo) {
            logger.info(`✅ Instagram test passed - connected as @${accountInfo.username}`);
            return true;
        }

        return false;
    }

    /**
     * Delay helper
     */
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Reload credentials (useful after config update)
     */
    reloadCredentials(): void {
        this.loadCredentials();
    }

    /**
     * Get current settings
     */
    getSettings(): InstagramSettings {
        return { ...this.settings };
    }

    /**
     * Update settings
     */
    async updateSettings(newSettings: Partial<InstagramSettings>): Promise<void> {
        this.settings = {
            ...this.settings,
            ...newSettings,
        };

        // Save to config.json
        try {
            const configPath = join(process.cwd(), 'config.json');
            let config: any = {};

            if (existsSync(configPath)) {
                config = JSON.parse(readFileSync(configPath, 'utf-8'));
            }

            config.instagram = {
                ...config.instagram,
                enabled: this.settings.enabled,
                autoReplyDM: this.settings.autoReplyDM,
                welcomeMessage: this.settings.welcomeMessage,
                keywordReplies: this.settings.keywordReplies,
            };

            writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
            logger.info('✅ Instagram settings updated');
        } catch (error: any) {
            logger.error(`Error saving Instagram settings: ${error.message}`);
            throw error;
        }
    }

    /**
     * Check if Instagram is enabled
     */
    isEnabled(): boolean {
        return this.settings.enabled;
    }

    /**
     * Disconnect (clear credentials)
     */
    async disconnect(): Promise<void> {
        this.accessToken = null;
        this.pageAccessToken = null;
        this.pageId = null;
        this.igUserId = null;

        // Update config
        try {
            const configPath = join(process.cwd(), 'config.json');
            if (existsSync(configPath)) {
                const config = JSON.parse(readFileSync(configPath, 'utf-8'));
                if (config.instagram) {
                    delete config.instagram.accessToken;
                    delete config.instagram.pageAccessToken;
                    delete config.instagram.pageId;
                    delete config.instagram.igUserId;
                    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
                }
            }
        } catch (error: any) {
            logger.error(`Error clearing Instagram credentials: ${error.message}`);
        }

        logger.info('Instagram disconnected');
    }

    // ========================================
    // Content Publishing (Stories & Reels)
    // ========================================

    /**
     * Publish a Story (image or video)
     * @param mediaUrl Public URL of the media (image or video)
     * @param mediaType Type of media: 'IMAGE' or 'VIDEO'
     * @returns Media ID if successful, null otherwise
     */
    async publishStory(mediaUrl: string, mediaType: 'IMAGE' | 'VIDEO' = 'IMAGE'): Promise<string | null> {
        if (!this.isAuthenticated()) {
            logger.warn('⚠️ Instagram not authenticated for publishing');
            return null;
        }

        try {
            // Step 1: Create media container for story
            const containerId = await this.createMediaContainer(mediaUrl, mediaType, undefined, true);
            if (!containerId) {
                return null;
            }

            // Step 2: Wait for media processing
            await this.waitForMediaProcessing(containerId);

            // Step 3: Publish the container
            const mediaId = await this.publishMediaContainer(containerId);
            if (mediaId) {
                logger.info(`✅ Instagram Story published: ${mediaId}`);
            }
            return mediaId;
        } catch (error: any) {
            logger.error(`❌ Error publishing Instagram Story: ${error.message}`);
            return null;
        }
    }

    /**
     * Publish a Reel (video)
     * @param videoUrl Public URL of the video (MP4, vertical 9:16 recommended)
     * @param caption Caption for the reel
     * @param shareToFeed Whether to also share to main feed
     * @returns Media ID if successful, null otherwise
     */
    async publishReel(videoUrl: string, caption?: string, shareToFeed: boolean = true): Promise<string | null> {
        if (!this.isAuthenticated()) {
            logger.warn('⚠️ Instagram not authenticated for publishing');
            return null;
        }

        try {
            // Step 1: Create reel container
            const containerId = await this.createReelContainer(videoUrl, caption, shareToFeed);
            if (!containerId) {
                return null;
            }

            // Step 2: Wait for video processing (can take longer)
            await this.waitForMediaProcessing(containerId, 60000); // 60 sec max wait

            // Step 3: Publish the reel
            const mediaId = await this.publishMediaContainer(containerId);
            if (mediaId) {
                logger.info(`✅ Instagram Reel published: ${mediaId}`);
            }
            return mediaId;
        } catch (error: any) {
            logger.error(`❌ Error publishing Instagram Reel: ${error.message}`);
            return null;
        }
    }

    /**
     * Create a media container for image/video story or post
     */
    private async createMediaContainer(
        mediaUrl: string,
        mediaType: 'IMAGE' | 'VIDEO',
        caption?: string,
        isStory: boolean = false
    ): Promise<string | null> {
        try {
            const params: any = {
                access_token: this.accessToken,
            };

            if (mediaType === 'IMAGE') {
                params.image_url = mediaUrl;
            } else {
                params.video_url = mediaUrl;
                params.media_type = 'VIDEO';
            }

            if (caption) {
                params.caption = caption;
            }

            if (isStory) {
                params.media_type = 'STORIES';
            }

            const response = await axios.post(
                `${this.graphApiBase}/${this.apiVersion}/${this.igUserId}/media`,
                null,
                { params }
            );

            return response.data.id;
        } catch (error: any) {
            const errorMsg = error.response?.data?.error?.message || error.message;
            logger.error(`Error creating media container: ${errorMsg}`);
            return null;
        }
    }

    /**
     * Create a reel container
     */
    private async createReelContainer(
        videoUrl: string,
        caption?: string,
        shareToFeed: boolean = true
    ): Promise<string | null> {
        try {
            const params: any = {
                access_token: this.accessToken,
                video_url: videoUrl,
                media_type: 'REELS',
                share_to_feed: shareToFeed,
            };

            if (caption) {
                params.caption = caption;
            }

            const response = await axios.post(
                `${this.graphApiBase}/${this.apiVersion}/${this.igUserId}/media`,
                null,
                { params }
            );

            return response.data.id;
        } catch (error: any) {
            const errorMsg = error.response?.data?.error?.message || error.message;
            logger.error(`Error creating reel container: ${errorMsg}`);
            return null;
        }
    }

    /**
     * Wait for media to finish processing
     */
    private async waitForMediaProcessing(containerId: string, maxWaitMs: number = 30000): Promise<boolean> {
        const startTime = Date.now();
        const pollInterval = 3000;

        while (Date.now() - startTime < maxWaitMs) {
            try {
                const response = await axios.get(
                    `${this.graphApiBase}/${this.apiVersion}/${containerId}`,
                    {
                        params: {
                            access_token: this.accessToken,
                            fields: 'status_code',
                        },
                    }
                );

                const status = response.data.status_code;
                if (status === 'FINISHED') {
                    return true;
                }
                if (status === 'ERROR') {
                    logger.error('Media processing failed');
                    return false;
                }

                await this.delay(pollInterval);
            } catch (error: any) {
                logger.error(`Error checking media status: ${error.message}`);
                return false;
            }
        }

        logger.warn('Media processing timeout');
        return false;
    }

    /**
     * Publish a media container (final step)
     */
    private async publishMediaContainer(containerId: string): Promise<string | null> {
        try {
            const response = await axios.post(
                `${this.graphApiBase}/${this.apiVersion}/${this.igUserId}/media_publish`,
                null,
                {
                    params: {
                        access_token: this.accessToken,
                        creation_id: containerId,
                    },
                }
            );

            return response.data.id;
        } catch (error: any) {
            const errorMsg = error.response?.data?.error?.message || error.message;
            logger.error(`Error publishing media: ${errorMsg}`);
            return null;
        }
    }

    /**
     * Get insights for a published media
     */
    async getMediaInsights(mediaId: string): Promise<{
        impressions?: number;
        reach?: number;
        likes?: number;
        comments?: number;
        shares?: number;
        saved?: number;
    } | null> {
        if (!this.isAuthenticated()) {
            return null;
        }

        try {
            const mediaResponse = await axios.get(
                `${this.graphApiBase}/${this.apiVersion}/${mediaId}`,
                {
                    params: {
                        access_token: this.accessToken,
                        fields: 'media_type,like_count,comments_count',
                    },
                }
            );

            const baseInsights = {
                likes: mediaResponse.data.like_count || 0,
                comments: mediaResponse.data.comments_count || 0,
            };

            try {
                const insightsResponse = await axios.get(
                    `${this.graphApiBase}/${this.apiVersion}/${mediaId}/insights`,
                    {
                        params: {
                            access_token: this.accessToken,
                            metric: 'impressions,reach,saved,shares',
                        },
                    }
                );

                const insightsData = insightsResponse.data.data || [];
                const insights: any = { ...baseInsights };

                for (const metric of insightsData) {
                    if (metric.name && metric.values?.[0]?.value !== undefined) {
                        insights[metric.name] = metric.values[0].value;
                    }
                }

                return insights;
            } catch {
                return baseInsights;
            }
        } catch (error: any) {
            logger.error(`Error getting media insights: ${error.message}`);
            return null;
        }
    }

    /**
     * Get recent media published by the account
     */
    async getRecentMedia(limit: number = 10): Promise<any[]> {
        if (!this.isAuthenticated()) {
            return [];
        }

        try {
            const response = await axios.get(
                `${this.graphApiBase}/${this.apiVersion}/${this.igUserId}/media`,
                {
                    params: {
                        access_token: this.accessToken,
                        fields: 'id,media_type,caption,timestamp,like_count,comments_count,permalink',
                        limit,
                    },
                }
            );

            return response.data.data || [];
        } catch (error: any) {
            logger.error(`Error fetching recent media: ${error.message}`);
            return [];
        }
    }
}
