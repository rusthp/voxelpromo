import Joi from 'joi';

/**
 * Validation schemas for Auth endpoints
 */

export const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(100).required(),
});

export const registerSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(50).required(),
    password: Joi.string().min(8).max(100).required()
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .message('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    email: Joi.string().email().required(),
});

export const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().min(6).max(100).required(),
    newPassword: Joi.string().min(8).max(100).required()
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .message('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
});
