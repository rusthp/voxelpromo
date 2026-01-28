import Joi from 'joi';

/**
 * Validation schemas for Profile endpoints
 */

export const updateProfileSchema = Joi.object({
    name: Joi.string()
        .max(100)
        .optional()
        .messages({
            'string.max': 'Nome não pode exceder 100 caracteres',
        }),

    email: Joi.string()
        .email()
        .optional()
        .messages({
            'string.email': 'Email inválido',
        }),

    avatarUrl: Joi.string()
        .uri()
        .optional()
        .messages({
            'string.uri': 'URL do avatar inválida',
        }),

    phone: Joi.string()
        .pattern(/^[\d\s+()-]+$/)
        .max(20)
        .optional()
        .messages({
            'string.pattern.base': 'Telefone inválido',
            'string.max': 'Telefone muito longo',
        }),
});

export const updateFiltersSchema = Joi.object({
    whitelist: Joi.array()
        .items(Joi.string().max(100))
        .max(100)
        .messages({
            'array.max': 'Whitelist pode ter no máximo 100 termos',
        }),

    blacklist: Joi.array()
        .items(Joi.string().max(100))
        .max(100)
        .messages({
            'array.max': 'Blacklist pode ter no máximo 100 termos',
        }),
});

export const updateBillingSchema = Joi.object({
    type: Joi.string()
        .valid('individual', 'company')
        .messages({
            'any.only': 'Tipo deve ser individual ou company',
        }),

    name: Joi.string()
        .max(100)
        .messages({
            'string.max': 'Nome não pode exceder 100 caracteres',
        }),

    document: Joi.string()
        .pattern(/^[\d.\-/]+$/)
        .max(20)
        .messages({
            'string.pattern.base': 'Documento inválido (apenas números, pontos, traços e barras)',
            'string.max': 'Documento muito longo',
        }),

    address: Joi.object({
        street: Joi.string().max(200),
        number: Joi.string().max(20),
        complement: Joi.string().max(100),
        neighborhood: Joi.string().max(100),
        city: Joi.string().max(100),
        state: Joi.string().length(2),
        zipCode: Joi.string().pattern(/^[\d-]+$/).max(10),
        country: Joi.string().max(50).default('Brasil'),
    }),
});
