import Joi from 'joi';

/**
 * Validation schemas for auth routes
 */

export const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required().messages({
    'string.alphanum': 'Username deve conter apenas letras e números',
    'string.min': 'Username deve ter no mínimo 3 caracteres',
    'string.max': 'Username deve ter no máximo 30 caracteres',
    'any.required': 'Username é obrigatório',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Email inválido',
    'any.required': 'Email é obrigatório',
  }),
  password: Joi.string().min(6).max(100).required().messages({
    'string.min': 'Senha deve ter no mínimo 6 caracteres',
    'string.max': 'Senha deve ter no máximo 100 caracteres',
    'any.required': 'Senha é obrigatória',
  }),
  role: Joi.string().valid('user', 'admin').optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email inválido',
    'any.required': 'Email é obrigatório',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Senha é obrigatória',
  }),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Senha atual é obrigatória',
  }),
  newPassword: Joi.string().min(6).max(100).required().messages({
    'string.min': 'Nova senha deve ter no mínimo 6 caracteres',
    'string.max': 'Nova senha deve ter no máximo 100 caracteres',
    'any.required': 'Nova senha é obrigatória',
  }),
});

/**
 * Middleware to validate request body against a Joi schema
 */
export function validateRequest(schema: Joi.ObjectSchema) {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => detail.message);
      return res.status(400).json({
        error: 'Validation error',
        details: errors,
      });
    }

    // Replace request body with validated value
    req.body = value;
    next();
  };
}
