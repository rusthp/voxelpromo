import Joi from 'joi';

/**
 * Validation schemas for Instagram endpoints
 */

export const instagramConfigSchema = Joi.object({
    appId: Joi.string()
        .min(1)
        .max(50)
        .optional()
        .messages({
            'string.min': 'App ID é obrigatório',
            'string.max': 'App ID inválido',
        }),

    appSecret: Joi.string()
        .min(1)
        .max(100)
        .optional()
        .messages({
            'string.min': 'App Secret é obrigatório',
            'string.max': 'App Secret inválido',
        }),

    webhookVerifyToken: Joi.string()
        .max(200)
        .optional(),

    accessToken: Joi.string()
        .max(500)
        .optional(),

    igUserId: Joi.string()
        .max(50)
        .optional(),
});

export const instagramSettingsSchema = Joi.object({
    autoReplyDM: Joi.boolean().optional(),
    welcomeMessage: Joi.string().max(1000).optional(),
    keywordReplies: Joi.object().pattern(
        Joi.string().max(50),
        Joi.string().max(500)
    ).optional(),
    conversionKeywords: Joi.array().items(Joi.string().max(50)).max(20).optional(),
});

export const instagramStorySchema = Joi.object({
    mediaUrl: Joi.string()
        .uri()
        .required()
        .messages({
            'string.uri': 'URL da mídia inválida',
            'any.required': 'URL da mídia é obrigatória',
        }),

    mediaType: Joi.string()
        .valid('IMAGE', 'VIDEO')
        .default('IMAGE')
        .optional(),
});

export const instagramReelSchema = Joi.object({
    videoUrl: Joi.string()
        .uri()
        .required()
        .messages({
            'string.uri': 'URL do vídeo inválida',
            'any.required': 'URL do vídeo é obrigatória',
        }),

    caption: Joi.string()
        .max(2200)
        .optional()
        .messages({
            'string.max': 'Legenda não pode exceder 2200 caracteres',
        }),

    shareToFeed: Joi.boolean()
        .default(true)
        .optional(),
});

export const instagramAuthExchangeSchema = Joi.object({
    code: Joi.string()
        .required()
        .messages({
            'any.required': 'Código de autorização é obrigatório',
        }),

    redirectUri: Joi.string()
        .uri()
        .required()
        .messages({
            'string.uri': 'Redirect URI inválida',
            'any.required': 'Redirect URI é obrigatória',
        }),
});
