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

  // Check that at least ONE AI provider is configured
  const aiProviders = ['GROQ_API_KEY', 'OPENAI_API_KEY', 'DEEPSEEK_API_KEY'];
  const hasAnyAI = aiProviders.some((key) => process.env[key] && process.env[key]?.trim() !== '');

  if (!hasAnyAI) {
    result.warnings.push(
      'No AI provider configured (GROQ_API_KEY, OPENAI_API_KEY, or DEEPSEEK_API_KEY)'
    );
    result.warnings.push('⚠️  AI content generation will not work without at least one provider');
  }

  // Check important variables (excluding AI keys since we checked above)
  const nonAIImportant = important.filter((v) => !aiProviders.includes(v));
  for (const varName of nonAIImportant) {
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
    result.warnings.push('⚠️  JWT_SECRET should be at least 32 characters long for security');
  }

  // Check for unsafe defaults in production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_SECRET?.includes('change') || process.env.JWT_SECRET?.includes('secret')) {
      result.warnings.push(
        '🚨 JWT_SECRET appears to be a default value - CHANGE IT IN PRODUCTION!'
      );
    }
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
