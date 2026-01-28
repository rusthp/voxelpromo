import Joi from 'joi';

/**
 * Validation schemas for Automation endpoints
 */

const validChannels = ['telegram', 'x', 'whatsapp', 'instagram'];
const validSources = ['aliexpress', 'amazon', 'mercadolivre', 'shopee', 'awin', 'lomadee', 'rakuten', 'rss', 'manual'];

export const automationConfigSchema = Joi.object({
    isActive: Joi.boolean()
        .messages({
            'boolean.base': 'isActive deve ser verdadeiro ou falso',
        }),

    startHour: Joi.number()
        .integer()
        .min(0)
        .max(23)
        .messages({
            'number.min': 'Hora inicial deve ser entre 0 e 23',
            'number.max': 'Hora inicial deve ser entre 0 e 23',
        }),

    endHour: Joi.number()
        .integer()
        .min(0)
        .max(23)
        .messages({
            'number.min': 'Hora final deve ser entre 0 e 23',
            'number.max': 'Hora final deve ser entre 0 e 23',
        }),

    intervalMinutes: Joi.number()
        .integer()
        .min(5)
        .max(360)
        .messages({
            'number.min': 'Intervalo mínimo é 5 minutos',
            'number.max': 'Intervalo máximo é 360 minutos (6 horas)',
        }),

    postsPerHour: Joi.number()
        .integer()
        .min(0)
        .max(30)
        .messages({
            'number.min': 'Posts por hora não pode ser negativo',
            'number.max': 'Máximo de 30 posts por hora',
        }),

    enabledChannels: Joi.array()
        .items(Joi.string().valid(...validChannels))
        .messages({
            'any.only': `Canal inválido. Opções: ${validChannels.join(', ')}`,
        }),

    enabledSources: Joi.array()
        .items(Joi.string().valid(...validSources))
        .messages({
            'any.only': `Fonte inválida. Opções: ${validSources.join(', ')}`,
        }),

    enabledCategories: Joi.array()
        .items(Joi.string().max(100)),

    minDiscount: Joi.number()
        .min(0)
        .max(100)
        .messages({
            'number.min': 'Desconto mínimo deve ser 0% ou mais',
            'number.max': 'Desconto mínimo não pode exceder 100%',
        }),

    maxPrice: Joi.number()
        .positive()
        .max(1000000)
        .messages({
            'number.positive': 'Preço máximo deve ser positivo',
            'number.max': 'Preço máximo não pode exceder R$ 1.000.000',
        }),

    peakHours: Joi.array()
        .items(
            Joi.object({
                start: Joi.number().integer().min(0).max(23).required(),
                end: Joi.number().integer().min(0).max(23).required(),
                priority: Joi.number().integer().min(1).max(10).default(5),
            })
        ),

    prioritizeBestSellersInPeak: Joi.boolean(),
    prioritizeBigDiscountsInPeak: Joi.boolean(),
    discountWeightVsSales: Joi.number().min(0).max(100),
});
