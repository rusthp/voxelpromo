import { logger } from './logger';

interface EnvValidationResult {
  isValid: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * Validate required environment variables
 * Returns validation result with missing variables and warnings
 */
export function validateEnv(): EnvValidationResult {
  const result: EnvValidationResult = {
    isValid: true,
    missing: [],
    warnings: [],
  };

  // Critical variables (must be set)
  const critical = ['MONGODB_URI', 'JWT_SECRET'];

  // Important variables (warn if missing)
  const important = [
    'PORT',
    'ALLOWED_ORIGINS',
    'GROQ_API_KEY',
    'OPENAI_API_KEY',
    'TELEGRAM_BOT_TOKEN',
    'WHATSAPP_ENABLED',
  ];

  // Check critical variables
  for (const varName of critical) {
    if (!process.env[varName] || process.env[varName]?.trim() === '') {
      result.missing.push(varName);
      result.isValid = false;
    }
  }

  // Check important variables
  for (const varName of important) {
    if (!process.env[varName] || process.env[varName]?.trim() === '') {
      result.warnings.push(`${varName} is not set (recommended)`);
    }
  }

  // Validate specific formats
  if (process.env.MONGODB_URI && !process.env.MONGODB_URI.startsWith('mongodb')) {
    result.warnings.push('MONGODB_URI should start with "mongodb://" or "mongodb+srv://"');
  }

  if (process.env.PORT && isNaN(Number(process.env.PORT))) {
    result.warnings.push('PORT should be a valid number');
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    result.warnings.push('JWT_SECRET should be at least 32 characters long for security');
  }

  return result;
}

/**
 * Validate environment and log results
 * Exit process if critical variables are missing
 */
export function validateAndLogEnv(): void {
  logger.info('🔍 Validating environment variables...');

  const validation = validateEnv();

  // Log missing critical variables
  if (validation.missing.length > 0) {
    logger.error('❌ Missing critical environment variables:');
    validation.missing.forEach((varName) => {
      logger.error(`   - ${varName}`);
    });
    logger.error('');
    logger.error('💡 Please set these variables in your .env file');
    logger.error('   See .env.example for reference');
    logger.error('');
    process.exit(1);
  }

  // Log warnings
  if (validation.warnings.length > 0) {
    logger.warn('⚠️  Environment warnings:');
    validation.warnings.forEach((warning) => {
      logger.warn(`   - ${warning}`);
    });
  }

  // Success
  if (validation.isValid && validation.warnings.length === 0) {
    logger.info('✅ All environment variables validated successfully');
  } else if (validation.isValid) {
    logger.info('✅ Critical environment variables validated (with warnings)');
  }
}
