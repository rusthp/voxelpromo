import Joi from 'joi';

/**
 * Validation schemas for Contact endpoints
 */

export const contactFormSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.min': 'Nome deve ter pelo menos 2 caracteres',
            'string.max': 'Nome deve ter no máximo 100 caracteres',
            'any.required': 'Nome é obrigatório',
        }),

    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Email inválido',
            'any.required': 'Email é obrigatório',
        }),

    subject: Joi.string()
        .min(5)
        .max(200)
        .required()
        .messages({
            'string.min': 'Assunto deve ter pelo menos 5 caracteres',
            'string.max': 'Assunto deve ter no máximo 200 caracteres',
            'any.required': 'Assunto é obrigatório',
        }),

    message: Joi.string()
        .min(10)
        .max(5000)
        .required()
        .messages({
            'string.min': 'Mensagem deve ter pelo menos 10 caracteres',
            'string.max': 'Mensagem deve ter no máximo 5000 caracteres',
            'any.required': 'Mensagem é obrigatória',
        }),
});
