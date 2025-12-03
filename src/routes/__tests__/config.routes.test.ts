import { validateTelegramBotToken, validateTelegramChatId, validateGroqApiKey, validateOpenAIApiKey } from '../../utils/validators';

describe('Config Routes - Validation Logic', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Server-Side Validation', () => {
        it('should validate Telegram Bot Token correctly', () => {
            // Valid token
            const validResult = validateTelegramBotToken('123456789:ABCdefGHIjklMNOpqrsTUVwxyz');
            expect(validResult.isValid).toBe(true);

            // Invalid token
            const invalidResult = validateTelegramBotToken('invalid-token');
            expect(invalidResult.isValid).toBe(false);
            expect(invalidResult.error).toBeDefined();
        });

        it('should validate Telegram Chat ID correctly', () => {
            // Valid positive chat ID
            const validPositive = validateTelegramChatId('123456789');
            expect(validPositive.isValid).toBe(true);

            // Valid negative chat ID (group)
            const validNegative = validateTelegramChatId('-1001234567890');
            expect(validNegative.isValid).toBe(true);

            // Invalid chat ID
            const invalid = validateTelegramChatId('abc123');
            expect(invalid.isValid).toBe(false);
        });

        it('should validate Groq API Key correctly', () => {
            // Valid key
            const valid = validateGroqApiKey('gsk_1234567890abcdefghijklmnopqrst');
            expect(valid.isValid).toBe(true);

            // Invalid - wrong prefix
            const wrongPrefix = validateGroqApiKey('sk_1234567890');
            expect(wrongPrefix.isValid).toBe(false);
            expect(wrongPrefix.error).toContain('gsk_');

            // Invalid - too short
            const tooShort = validateGroqApiKey('gsk_123');
            expect(tooShort.isValid).toBe(false);
        });

        it('should validate OpenAI API Key correctly', () => {
            // Valid key
            const valid = validateOpenAIApiKey('sk-1234567890abcdefghijklmnopqrst');
            expect(valid.isValid).toBe(true);

            // Invalid - wrong prefix
            const wrongPrefix = validateOpenAIApiKey('gsk_1234567890');
            expect(wrongPrefix.isValid).toBe(false);
            expect(wrongPrefix.error).toContain('sk-');

            // Invalid - too short
            const tooShort = validateOpenAIApiKey('sk-123');
            expect(tooShort.isValid).toBe(false);
        });
    });

    describe('Config Validation Flow', () => {
        it('should reject config with invalid Telegram Bot Token', () => {
            const config = {
                telegram: {
                    botToken: 'invalid-token',
                    chatId: '123456789'
                }
            };

            // Simulate validation
            const validationErrors: string[] = [];

            if (config.telegram?.botToken && config.telegram.botToken !== '***') {
                const validation = validateTelegramBotToken(config.telegram.botToken);
                if (!validation.isValid) {
                    validationErrors.push(`Telegram Bot Token: ${validation.error}`);
                }
            }

            expect(validationErrors.length).toBeGreaterThan(0);
            expect(validationErrors[0]).toContain('Telegram Bot Token');
        });

        it('should reject config with invalid Groq API Key', () => {
            const config = {
                ai: {
                    groqApiKey: 'sk_wrong_prefix',
                    provider: 'groq'
                }
            };

            const validationErrors: string[] = [];

            if (config.ai?.groqApiKey && config.ai.groqApiKey !== '***') {
                const validation = validateGroqApiKey(config.ai.groqApiKey);
                if (!validation.isValid) {
                    validationErrors.push(`Groq API Key: ${validation.error}`);
                }
            }

            expect(validationErrors.length).toBeGreaterThan(0);
            expect(validationErrors[0]).toContain('Groq API Key');
        });

        it('should accept config with valid fields', () => {
            const config = {
                telegram: {
                    botToken: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
                    chatId: '-1001234567890'
                },
                ai: {
                    groqApiKey: 'gsk_1234567890abcdefghijklmnopqrst'
                }
            };

            const validationErrors: string[] = [];

            // Validate Telegram Bot Token
            if (config.telegram?.botToken && config.telegram.botToken !== '***') {
                const validation = validateTelegramBotToken(config.telegram.botToken);
                if (!validation.isValid) {
                    validationErrors.push(`Telegram Bot Token: ${validation.error}`);
                }
            }

            // Validate Telegram Chat ID
            if (config.telegram?.chatId) {
                const validation = validateTelegramChatId(config.telegram.chatId);
                if (!validation.isValid) {
                    validationErrors.push(`Telegram Chat ID: ${validation.error}`);
                }
            }

            // Validate Groq Key
            if (config.ai?.groqApiKey && config.ai.groqApiKey !== '***') {
                const validation = validateGroqApiKey(config.ai.groqApiKey);
                if (!validation.isValid) {
                    validationErrors.push(`Groq API Key: ${validation.error}`);
                }
            }

            expect(validationErrors.length).toBe(0);
        });

        it('should handle masked values (***) correctly', () => {
            const config = {
                telegram: {
                    botToken: '***', // Masked - should not be validated
                    chatId: '123456789'
                }
            };

            const validationErrors: string[] = [];

            // Validate Telegram Bot Token (should skip masked)
            if (config.telegram?.botToken && config.telegram.botToken !== '***') {
                const validation = validateTelegramBotToken(config.telegram.botToken);
                if (!validation.isValid) {
                    validationErrors.push(`Telegram Bot Token: ${validation.error}`);
                }
            }

            // Should not have errors because masked value was skipped
            expect(validationErrors.length).toBe(0);
        });

        it('should collect multiple validation errors', () => {
            const config = {
                telegram: {
                    botToken: 'invalid',
                    chatId: 'abc' // Invalid
                },
                ai: {
                    groqApiKey: 'wrong' // Invalid
                }
            };

            const validationErrors: string[] = [];

            if (config.telegram?.botToken && config.telegram.botToken !== '***') {
                const validation = validateTelegramBotToken(config.telegram.botToken);
                if (!validation.isValid) {
                    validationErrors.push(`Telegram Bot Token: ${validation.error}`);
                }
            }

            if (config.telegram?.chatId) {
                const validation = validateTelegramChatId(config.telegram.chatId);
                if (!validation.isValid) {
                    validationErrors.push(`Telegram Chat ID: ${validation.error}`);
                }
            }

            if (config.ai?.groqApiKey && config.ai.groqApiKey !== '***') {
                const validation = validateGroqApiKey(config.ai.groqApiKey);
                if (!validation.isValid) {
                    validationErrors.push(`Groq API Key: ${validation.error}`);
                }
            }

            // Should have 3 errors
            expect(validationErrors.length).toBe(3);
            expect(validationErrors).toEqual(expect.arrayContaining([
                expect.stringContaining('Telegram Bot Token'),
                expect.stringContaining('Telegram Chat ID'),
                expect.stringContaining('Groq API Key')
            ]));
        });
    });

    describe('Config Merging Logic', () => {
        it('should preserve existing values when new value is masked', () => {
            const existingConfig = {
                telegram: {
                    botToken: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz'
                }
            };

            const newConfig = {
                telegram: {
                    botToken: '***' // Masked - should preserve existing
                }
            };

            // Simulate merge logic
            const mergedToken = newConfig.telegram.botToken === '***'
                ? existingConfig.telegram.botToken
                : newConfig.telegram.botToken;

            expect(mergedToken).toBe(existingConfig.telegram.botToken);
        });

        it('should update value when new value is provided', () => {
            const existingConfig = {
                telegram: {
                    botToken: '123456789:OLDtoken'
                }
            };

            const newConfig = {
                telegram: {
                    botToken: '987654321:NEWtoken'
                }
            };

            // Simulate merge logic
            const mergedToken = newConfig.telegram.botToken !== '***' && newConfig.telegram.botToken.trim().length > 0
                ? newConfig.telegram.botToken
                : existingConfig.telegram.botToken;

            expect(mergedToken).toBe(newConfig.telegram.botToken);
        });
    });
});
