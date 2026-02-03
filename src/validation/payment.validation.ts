import Joi from 'joi';

/**
 * Validation schemas for Payment endpoints
 */

const validPlans = ['free', 'performance', 'plus', 'trial', 'pro', 'agency'];
const validPaymentMethods = ['credit_card', 'pix', 'boleto'];

export const createCheckoutSchema = Joi.object({
    planId: Joi.string()
        .valid(...validPlans)
        .required()
        .messages({
            'any.only': `Plano inválido. Opções: ${validPlans.join(', ')}`,
            'any.required': 'ID do plano é obrigatório',
        }),

    paymentMethod: Joi.string()
        .valid(...validPaymentMethods)
        .messages({
            'any.only': `Método de pagamento inválido. Opções: ${validPaymentMethods.join(', ')}`,
        }),

    provider: Joi.string()
        .valid('stripe', 'mercadopago')
        .optional(),
});

export const createPixSchema = Joi.object({
    planId: Joi.string()
        .valid(...validPlans)
        .required()
        .messages({
            'any.only': `Plano inválido. Opções: ${validPlans.join(', ')}`,
            'any.required': 'ID do plano é obrigatório',
        }),

    payerEmail: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Email inválido',
            'any.required': 'Email é obrigatório',
        }),

    payerCpf: Joi.string()
        .pattern(/^[\d.-]+$/)
        .min(11)
        .max(14)
        .required()
        .messages({
            'string.pattern.base': 'CPF inválido',
            'any.required': 'CPF é obrigatório',
        }),

    amount: Joi.number()
        .positive()
        .max(10000)
        .messages({
            'number.positive': 'Valor deve ser positivo',
            'number.max': 'Valor máximo é R$ 10.000',
        }),
});

export const createBoletoSchema = Joi.object({
    planId: Joi.string()
        .valid(...validPlans)
        .required()
        .messages({
            'any.only': `Plano inválido. Opções: ${validPlans.join(', ')}`,
            'any.required': 'ID do plano é obrigatório',
        }),

    payerEmail: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Email inválido',
            'any.required': 'Email é obrigatório',
        }),

    payerCpf: Joi.string()
        .pattern(/^[\d.-]+$/)
        .min(11)
        .max(14)
        .required()
        .messages({
            'string.pattern.base': 'CPF inválido',
            'any.required': 'CPF é obrigatório',
        }),

    amount: Joi.number()
        .positive()
        .max(10000)
        .optional()
        .messages({
            'number.positive': 'Valor deve ser positivo',
        }),

    address: Joi.object({
        zip_code: Joi.string().required(),
        street_name: Joi.string().required(),
        street_number: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
        neighborhood: Joi.string().required(),
        city: Joi.string().required(),
        federal_unit: Joi.string().required().length(2)
    }).required().messages({
        'any.required': 'Endereço é obrigatório para boleto'
    })
});

export const processSubscriptionSchema = Joi.object({
    planId: Joi.string()
        .valid(...validPlans)
        .required()
        .messages({
            'any.only': `Plano inválido. Opções: ${validPlans.join(', ')}`,
            'any.required': 'ID do plano é obrigatório',
        }),

    paymentMethodId: Joi.string()
        .max(100)
        .optional(),
});

export const cancelSubscriptionSchema = Joi.object({
    reason: Joi.string()
        .max(500)
        .optional()
        .messages({
            'string.max': 'Motivo não pode exceder 500 caracteres',
        }),

    feedback: Joi.string()
        .max(1000)
        .optional()
        .messages({
            'string.max': 'Feedback não pode exceder 1000 caracteres',
        }),
});
