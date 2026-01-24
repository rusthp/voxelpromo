import Joi from 'joi';

/**
 * Validation schemas for Auth endpoints
 */

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(100).required(),
});

export const registerSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(50)
    .pattern(/^[\w-]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Username must only contain letters, numbers, underscores and hyphens',
    }),
  password: Joi.string()
    .min(8)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.pattern.base':
        'Password must contain at least one uppercase, one lowercase, and one number',
    }),
  email: Joi.string().email().required(),
  accountType: Joi.string().valid('individual', 'company').default('individual'),
  name: Joi.string().max(100).optional(),
  document: Joi.string().max(20).optional(),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(6).max(100).required(),
  newPassword: Joi.string()
    .min(8)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.pattern.base':
        'Password must contain at least one uppercase, one lowercase, and one number',
    }),
});
