import Joi from 'joi';

/**
 * Validation schemas for Instagram endpoints
 */

export const instagramConfigSchema = Joi.object({
    appId: Joi.string()
        .min(1)
        .max(50)
        .required()
        .messages({
            'string.min': 'App ID é obrigatório',
            'string.max': 'App ID inválido',
            'any.required': 'App ID é obrigatório',
        }),

    appSecret: Joi.string()
        .min(1)
        .max(100)
        .required()
        .messages({
            'string.min': 'App Secret é obrigatório',
            'string.max': 'App Secret inválido',
            'any.required': 'App Secret é obrigatório',
        }),
});

export const instagramSettingsSchema = Joi.object({
    autoPost: Joi.boolean(),
    postToStory: Joi.boolean(),
    postToFeed: Joi.boolean(),
    defaultCaption: Joi.string().max(2200),
    hashtags: Joi.array().items(Joi.string().max(50).pattern(/^[#]?[\w]+$/)),
});

export const instagramStorySchema = Joi.object({
    imageUrl: Joi.string()
        .uri()
        .required()
        .messages({
            'string.uri': 'URL da imagem inválida',
            'any.required': 'URL da imagem é obrigatória',
        }),

    caption: Joi.string()
        .max(2200)
        .optional()
        .messages({
            'string.max': 'Legenda não pode exceder 2200 caracteres',
        }),
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

    coverUrl: Joi.string()
        .uri()
        .optional()
        .messages({
            'string.uri': 'URL da capa inválida',
        }),
});

export const instagramAuthExchangeSchema = Joi.object({
    code: Joi.string()
        .required()
        .messages({
            'any.required': 'Código de autorização é obrigatório',
        }),
});
