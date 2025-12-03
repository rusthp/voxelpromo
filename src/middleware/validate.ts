import { Request, Response, NextFunction } from 'express';
import { ObjectSchema } from 'joi';
import { logger } from '../utils/logger';

/**
 * Middleware to validate request body/query/params against a Joi schema
 */
export function validate(schema: ObjectSchema, property: 'body' | 'query' | 'params' = 'body') {
    return (req: Request, res: Response, next: NextFunction) => {
        const { error, value } = schema.validate(req[property], {
            abortEarly: false, // Return all errors
            stripUnknown: true, // Remove unknown fields (security)
        });

        if (error) {
            const errorDetails = error.details.map((detail) => ({
                field: detail.path.join('.'),
                message: detail.message,
            }));

            logger.warn('Validation error:', errorDetails);

            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errorDetails,
            });
        }

        // Replace request data with validated and sanitized data
        req[property] = value;
        return next();
    };
}
