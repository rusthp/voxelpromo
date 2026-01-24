/**
 * Validators for configuration inputs
 * Used in both frontend and backend to ensure consistent validation
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate Telegram Bot Token
 * Format: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
 */
export function validateTelegramBotToken(token: string): ValidationResult {
  if (!token || token.trim() === '') {
    return { isValid: false, error: 'Bot token is required' };
  }

  const telegramBotTokenRegex = /^\d+:[A-Za-z0-9_-]+$/;
  if (!telegramBotTokenRegex.test(token.trim())) {
    return {
      isValid: false,
      error: 'Invalid Telegram bot token format. Expected: "123456789:ABC..."',
    };
  }

  return { isValid: true };
}

/**
 * Validate Telegram Chat ID
 * Can be positive (personal chat) or negative (group chat)
 */
export function validateTelegramChatId(chatId: string): ValidationResult {
  if (!chatId || chatId.trim() === '') {
    return { isValid: false, error: 'Chat ID is required' };
  }

  const telegramChatIdRegex = /^-?\d+$/;
  if (!telegramChatIdRegex.test(chatId.trim())) {
    return {
      isValid: false,
      error: 'Invalid Chat ID format. Expected: numbers only (can be negative for groups)',
    };
  }

  return { isValid: true };
}

/**
 * Validate Groq API Key
 * Format: gsk_...
 */
export function validateGroqApiKey(apiKey: string): ValidationResult {
  if (!apiKey || apiKey.trim() === '') {
    return { isValid: false, error: 'Groq API key is required' };
  }

  if (!apiKey.trim().startsWith('gsk_')) {
    return {
      isValid: false,
      error: 'Invalid Groq API key format. Expected: starts with "gsk_"',
    };
  }

  if (apiKey.trim().length < 20) {
    return {
      isValid: false,
      error: 'Groq API key seems too short',
    };
  }

  return { isValid: true };
}

/**
 * Validate OpenAI API Key
 * Format: sk-...
 */
export function validateOpenAIApiKey(apiKey: string): ValidationResult {
  if (!apiKey || apiKey.trim() === '') {
    return { isValid: false, error: 'OpenAI API key is required' };
  }

  if (!apiKey.trim().startsWith('sk-')) {
    return {
      isValid: false,
      error: 'Invalid OpenAI API key format. Expected: starts with "sk-"',
    };
  }

  if (apiKey.trim().length < 20) {
    return {
      isValid: false,
      error: 'OpenAI API key seems too short',
    };
  }

  return { isValid: true };
}

/**
 * Validate URL
 */
export function validateUrl(url: string): ValidationResult {
  if (!url || url.trim() === '') {
    return { isValid: false, error: 'URL is required' };
  }

  try {
    const urlObj = new URL(url.trim());
    if (!urlObj.protocol.startsWith('http')) {
      return {
        isValid: false,
        error: 'URL must use HTTP or HTTPS protocol',
      };
    }
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid URL format',
    };
  }
}

/**
 * Validate RSS Feed URL
 */
export function validateRssFeedUrl(url: string): ValidationResult {
  return validateUrl(url);
}

/**
 * Validate WhatsApp Phone Number
 * Format: International format with country code (e.g., 5511999999999)
 */
export function validateWhatsAppPhoneNumber(phoneNumber: string): ValidationResult {
  if (!phoneNumber || phoneNumber.trim() === '') {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Remove any non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');

  if (cleaned.length < 10 || cleaned.length > 15) {
    return {
      isValid: false,
      error: 'Phone number must be 10-15 digits (international format with country code)',
    };
  }

  return { isValid: true };
}

/**
 * Validate Amazon Associate Tag
 * Format: alphanumeric with hyphens, typically ends with -20 or -21
 */
export function validateAmazonAssociateTag(tag: string): ValidationResult {
  if (!tag || tag.trim() === '') {
    return { isValid: false, error: 'Associate tag is required' };
  }

  const amazonTagRegex = /^[a-zA-Z0-9_-]+$/;
  if (!amazonTagRegex.test(tag.trim())) {
    return {
      isValid: false,
      error: 'Invalid Associate tag format. Use only letters, numbers, hyphens, and underscores',
    };
  }

  return { isValid: true };
}

/**
 * Validate email address
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return {
      isValid: false,
      error: 'Invalid email format',
    };
  }

  return { isValid: true };
}

/**
 * Validate non-empty string
 */
export function validateNonEmpty(value: string, fieldName: string = 'Field'): ValidationResult {
  if (!value || value.trim() === '') {
    return {
      isValid: false,
      error: `${fieldName} is required`,
    };
  }

  return { isValid: true };
}
