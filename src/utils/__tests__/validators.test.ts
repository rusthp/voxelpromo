import {
    validateTelegramBotToken,
    validateTelegramChatId,
    validateGroqApiKey,
    validateOpenAIApiKey,
    validateUrl,
    validateWhatsAppPhoneNumber,
    validateAmazonAssociateTag,
    validateEmail,
    validateNonEmpty,
} from '../validators';

describe('Validators', () => {
    describe('validateTelegramBotToken', () => {
        it('should accept valid bot token', () => {
            const result = validateTelegramBotToken('123456789:ABCdefGHIjklMNOpqrsTUVwxyz');
            expect(result.isValid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should reject empty token', () => {
            const result = validateTelegramBotToken('');
            expect(result.isValid).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should reject invalid format', () => {
            const result = validateTelegramBotToken('invalid-token');
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('Invalid Telegram bot token format');
        });

        it('should reject token without colon', () => {
            const result = validateTelegramBotToken('123456789ABCdefGHI');
            expect(result.isValid).toBe(false);
        });
    });

    describe('validateTelegramChatId', () => {
        it('should accept positive chat ID', () => {
            const result = validateTelegramChatId('123456789');
            expect(result.isValid).toBe(true);
        });

        it('should accept negative chat ID (groups)', () => {
            const result = validateTelegramChatId('-1001234567890');
            expect(result.isValid).toBe(true);
        });

        it('should reject empty chat ID', () => {
            const result = validateTelegramChatId('');
            expect(result.isValid).toBe(false);
        });

        it('should reject non-numeric chat ID', () => {
            const result = validateTelegramChatId('abc123');
            expect(result.isValid).toBe(false);
        });
    });

    describe('validateGroqApiKey', () => {
        it('should accept valid Groq API key', () => {
            const result = validateGroqApiKey('gsk_1234567890abcdefghijklmnopqrst');
            expect(result.isValid).toBe(true);
        });

        it('should reject empty API key', () => {
            const result = validateGroqApiKey('');
            expect(result.isValid).toBe(false);
        });

        it('should reject API key without gsk_ prefix', () => {
            const result = validateGroqApiKey('sk_1234567890');
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('gsk_');
        });

        it('should reject too short API key', () => {
            const result = validateGroqApiKey('gsk_123');
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('too short');
        });
    });

    describe('validateOpenAIApiKey', () => {
        it('should accept valid OpenAI API key', () => {
            const result = validateOpenAIApiKey('sk-1234567890abcdefghijklmnopqrst');
            expect(result.isValid).toBe(true);
        });

        it('should reject empty API key', () => {
            const result = validateOpenAIApiKey('');
            expect(result.isValid).toBe(false);
        });

        it('should reject API key without sk- prefix', () => {
            const result = validateOpenAIApiKey('gsk_1234567890');
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('sk-');
        });

        it('should reject too short API key', () => {
            const result = validateOpenAIApiKey('sk-123');
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('too short');
        });
    });

    describe('validateUrl', () => {
        it('should accept valid HTTP URL', () => {
            const result = validateUrl('http://example.com');
            expect(result.isValid).toBe(true);
        });

        it('should accept valid HTTPS URL', () => {
            const result = validateUrl('https://example.com/path');
            expect(result.isValid).toBe(true);
        });

        it('should reject empty URL', () => {
            const result = validateUrl('');
            expect(result.isValid).toBe(false);
        });

        it('should reject invalid URL', () => {
            const result = validateUrl('not-a-url');
            expect(result.isValid).toBe(false);
        });

        it('should reject non-HTTP protocol', () => {
            const result = validateUrl('ftp://example.com');
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('HTTP or HTTPS');
        });
    });

    describe('validateWhatsAppPhoneNumber', () => {
        it('should accept valid phone number', () => {
            const result = validateWhatsAppPhoneNumber('5511999999999');
            expect(result.isValid).toBe(true);
        });

        it('should accept phone number with formatting', () => {
            const result = validateWhatsAppPhoneNumber('+55 (11) 99999-9999');
            expect(result.isValid).toBe(true);
        });

        it('should reject empty phone number', () => {
            const result = validateWhatsAppPhoneNumber('');
            expect(result.isValid).toBe(false);
        });

        it('should reject too short phone number', () => {
            const result = validateWhatsAppPhoneNumber('123');
            expect(result.isValid).toBe(false);
        });

        it('should reject too long phone number', () => {
            const result = validateWhatsAppPhoneNumber('1234567890123456');
            expect(result.isValid).toBe(false);
        });
    });

    describe('validateAmazonAssociateTag', () => {
        it('should accept valid associate tag', () => {
            const result = validateAmazonAssociateTag('mysite-20');
            expect(result.isValid).toBe(true);
        });

        it('should accept tag with underscores', () => {
            const result = validateAmazonAssociateTag('my_site-21');
            expect(result.isValid).toBe(true);
        });

        it('should reject empty tag', () => {
            const result = validateAmazonAssociateTag('');
            expect(result.isValid).toBe(false);
        });

        it('should reject tag with special characters', () => {
            const result = validateAmazonAssociateTag('my@site');
            expect(result.isValid).toBe(false);
        });
    });

    describe('validateEmail', () => {
        it('should accept valid email', () => {
            const result = validateEmail('user@example.com');
            expect(result.isValid).toBe(true);
        });

        it('should reject empty email', () => {
            const result = validateEmail('');
            expect(result.isValid).toBe(false);
        });

        it('should reject invalid email format', () => {
            const result = validateEmail('not-an-email');
            expect(result.isValid).toBe(false);
        });

        it('should reject email without domain', () => {
            const result = validateEmail('user@');
            expect(result.isValid).toBe(false);
        });
    });

    describe('validateNonEmpty', () => {
        it('should accept non-empty string', () => {
            const result = validateNonEmpty('value');
            expect(result.isValid).toBe(true);
        });

        it('should reject empty string', () => {
            const result = validateNonEmpty('', 'Test Field');
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('Test Field');
        });

        it('should reject whitespace only', () => {
            const result = validateNonEmpty('   ');
            expect(result.isValid).toBe(false);
        });
    });
});
