import {
    validateTelegramBotToken,
    validateTelegramChatId,
    validateGroqApiKey,
    validateOpenAIApiKey,
    validateUrl,
    validateRssFeedUrl,
    validateWhatsAppPhoneNumber,
    validateAmazonAssociateTag,
    validateEmail,
    validateNonEmpty,
} from '../validators'

describe('Telegram Validators', () => {
    describe('validateTelegramBotToken', () => {
        it('should accept valid token format', () => {
            const result = validateTelegramBotToken('123456789:ABCdefGHI-jklMNO_pqr')
            expect(result.isValid).toBe(true)
            expect(result.error).toBeUndefined()
        })

        it('should accept token with only numbers after colon', () => {
            const result = validateTelegramBotToken('987654321:123456789')
            expect(result.isValid).toBe(true)
        })

        it('should reject token without colon', () => {
            const result = validateTelegramBotToken('123456789ABCdef')
            expect(result.isValid).toBe(false)
            expect(result.error).toContain('Invalid')
        })

        it('should reject token with only numbers', () => {
            const result = validateTelegramBotToken('123456789:')
            expect(result.isValid).toBe(false)
        })

        it('should reject empty token', () => {
            const result = validateTelegramBotToken('')
            expect(result.isValid).toBe(false)
            expect(result.error).toContain('required')
        })

        it('should reject token with only whitespace', () => {
            const result = validateTelegramBotToken('   ')
            expect(result.isValid).toBe(false)
            expect(result.error).toContain('required')
        })

        it('should handle token with leading/trailing spaces', () => {
            const result = validateTelegramBotToken('  123456789:ABCdef  ')
            expect(result.isValid).toBe(true)
        })

        it('should reject token with special characters', () => {
            const result = validateTelegramBotToken('123456789:ABC@def!')
            expect(result.isValid).toBe(false)
        })
    })

    describe('validateTelegramChatId', () => {
        it('should accept positive chat ID', () => {
            const result = validateTelegramChatId('123456789')
            expect(result.isValid).toBe(true)
        })

        it('should accept negative chat ID (groups)', () => {
            const result = validateTelegramChatId('-1001234567890')
            expect(result.isValid).toBe(true)
        })

        it('should accept single digit', () => {
            const result = validateTelegramChatId('1')
            expect(result.isValid).toBe(true)
        })

        it('should reject alphabetic characters', () => {
            const result = validateTelegramChatId('abc123')
            expect(result.isValid).toBe(false)
            expect(result.error).toContain('Invalid')
        })

        it('should reject special characters', () => {
            const result = validateTelegramChatId('123@456')
            expect(result.isValid).toBe(false)
        })

        it('should reject empty string', () => {
            const result = validateTelegramChatId('')
            expect(result.isValid).toBe(false)
            expect(result.error).toContain('required')
        })

        it('should handle leading/trailing spaces', () => {
            const result = validateTelegramChatId('  -123456  ')
            expect(result.isValid).toBe(true)
        })
    })
})

describe('AI API Key Validators', () => {
    describe('validateGroqApiKey', () => {
        it('should accept valid Groq API key', () => {
            const result = validateGroqApiKey('gsk_1234567890abcdefghijklmnop')
            expect(result.isValid).toBe(true)
        })

        it('should reject key without gsk_ prefix', () => {
            const result = validateGroqApiKey('sk_1234567890abcdefghijklmnop')
            expect(result.isValid).toBe(false)
            expect(result.error).toContain('gsk_')
        })

        it('should reject key that is too short', () => {
            const result = validateGroqApiKey('gsk_123')
            expect(result.isValid).toBe(false)
            expect(result.error).toContain('too short')
        })

        it('should reject empty key', () => {
            const result = validateGroqApiKey('')
            expect(result.isValid).toBe(false)
            expect(result.error).toContain('required')
        })

        it('should handle leading/trailing spaces', () => {
            const result = validateGroqApiKey('  gsk_1234567890abcdefghijklmnop  ')
            expect(result.isValid).toBe(true)
        })

        it('should reject key with only prefix', () => {
            const result = validateGroqApiKey('gsk_')
            expect(result.isValid).toBe(false)
        })
    })

    describe('validateOpenAIApiKey', () => {
        it('should accept valid OpenAI API key', () => {
            const result = validateOpenAIApiKey('sk-1234567890abcdefghijklmnop')
            expect(result.isValid).toBe(true)
        })

        it('should reject key without sk- prefix', () => {
            const result = validateOpenAIApiKey('gsk_1234567890abcdefghijklmnop')
            expect(result.isValid).toBe(false)
            expect(result.error).toContain('sk-')
        })

        it('should reject key that is too short', () => {
            const result = validateOpenAIApiKey('sk-123')
            expect(result.isValid).toBe(false)
            expect(result.error).toContain('too short')
        })

        it('should reject empty key', () => {
            const result = validateOpenAIApiKey('')
            expect(result.isValid).toBe(false)
            expect(result.error).toContain('required')
        })

        it('should handle leading/trailing spaces', () => {
            const result = validateOpenAIApiKey('  sk-1234567890abcdefghijklmnop  ')
            expect(result.isValid).toBe(true)
        })
    })
})

describe('URL Validators', () => {
    describe('validateUrl', () => {
        it('should accept valid HTTP URL', () => {
            const result = validateUrl('http://example.com')
            expect(result.isValid).toBe(true)
        })

        it('should accept valid HTTPS URL', () => {
            const result = validateUrl('https://example.com/path?query=1')
            expect(result.isValid).toBe(true)
        })

        it('should accept URL with port', () => {
            const result = validateUrl('http://localhost:3000')
            expect(result.isValid).toBe(true)
        })

        it('should reject URL without protocol', () => {
            const result = validateUrl('example.com')
            expect(result.isValid).toBe(false)
            expect(result.error).toContain('Invalid')
        })

        it('should reject FTP protocol', () => {
            const result = validateUrl('ftp://example.com')
            expect(result.isValid).toBe(false)
            expect(result.error).toContain('HTTP or HTTPS')
        })

        it('should reject empty URL', () => {
            const result = validateUrl('')
            expect(result.isValid).toBe(false)
            expect(result.error).toContain('required')
        })

        it('should reject invalid URL format', () => {
            const result = validateUrl('not a url')
            expect(result.isValid).toBe(false)
            expect(result.error).toContain('Invalid')
        })

        it('should handle leading/trailing spaces', () => {
            const result = validateUrl('  https://example.com  ')
            expect(result.isValid).toBe(true)
        })
    })

    describe('validateRssFeedUrl', () => {
        it('should accept valid RSS feed URL', () => {
            const result = validateRssFeedUrl('https://example.com/feed.xml')
            expect(result.isValid).toBe(true)
        })

        it('should reject invalid URL', () => {
            const result = validateRssFeedUrl('not-a-url')
            expect(result.isValid).toBe(false)
        })
    })
})

describe('Contact Validators', () => {
    describe('validateWhatsAppPhoneNumber', () => {
        it('should accept valid international phone number', () => {
            const result = validateWhatsAppPhoneNumber('5511999999999')
            expect(result.isValid).toBe(true)
        })

        it('should accept phone number with spaces', () => {
            const result = validateWhatsAppPhoneNumber('+55 11 99999-9999')
            expect(result.isValid).toBe(true)
        })

        it('should accept phone number with special chars', () => {
            const result = validateWhatsAppPhoneNumber('+1 (555) 123-4567')
            expect(result.isValid).toBe(true)
        })

        it('should reject phone number too short', () => {
            const result = validateWhatsAppPhoneNumber('123')
            expect(result.isValid).toBe(false)
            expect(result.error).toContain('10-15 digits')
        })

        it('should reject phone number too long', () => {
            const result = validateWhatsAppPhoneNumber('12345678901234567890')
            expect(result.isValid).toBe(false)
            expect(result.error).toContain('10-15 digits')
        })

        it('should reject empty phone number', () => {
            const result = validateWhatsAppPhoneNumber('')
            expect(result.isValid).toBe(false)
            expect(result.error).toContain('required')
        })

        it('should accept exactly 10 digits', () => {
            const result = validateWhatsAppPhoneNumber('1234567890')
            expect(result.isValid).toBe(true)
        })

        it('should accept exactly 15 digits', () => {
            const result = validateWhatsAppPhoneNumber('123456789012345')
            expect(result.isValid).toBe(true)
        })
    })

    describe('validateEmail', () => {
        it('should accept valid email', () => {
            const result = validateEmail('test@example.com')
            expect(result.isValid).toBe(true)
        })

        it('should accept email with subdomain', () => {
            const result = validateEmail('user@mail.example.com')
            expect(result.isValid).toBe(true)
        })

        it('should accept email with numbers', () => {
            const result = validateEmail('user123@test123.com')
            expect(result.isValid).toBe(true)
        })

        it('should accept email with dots', () => {
            const result = validateEmail('first.last@example.com')
            expect(result.isValid).toBe(true)
        })

        it('should reject email without @', () => {
            const result = validateEmail('testexample.com')
            expect(result.isValid).toBe(false)
            expect(result.error).toContain('Invalid')
        })

        it('should reject email without domain', () => {
            const result = validateEmail('test@')
            expect(result.isValid).toBe(false)
        })

        it('should reject email without TLD', () => {
            const result = validateEmail('test@example')
            expect(result.isValid).toBe(false)
        })

        it('should reject empty email', () => {
            const result = validateEmail('')
            expect(result.isValid).toBe(false)
            expect(result.error).toContain('required')
        })

        it('should handle leading/trailing spaces', () => {
            const result = validateEmail('  test@example.com  ')
            expect(result.isValid).toBe(true)
        })
    })
})

describe('Amazon Validator', () => {
    describe('validateAmazonAssociateTag', () => {
        it('should accept valid associate tag', () => {
            const result = validateAmazonAssociateTag('mysite-20')
            expect(result.isValid).toBe(true)
        })

        it('should accept tag with hyphens', () => {
            const result = validateAmazonAssociateTag('my-site-21')
            expect(result.isValid).toBe(true)
        })

        it('should accept tag with underscores', () => {
            const result = validateAmazonAssociateTag('my_site_20')
            expect(result.isValid).toBe(true)
        })

        it('should accept alphanumeric tag', () => {
            const result = validateAmazonAssociateTag('mysite123')
            expect(result.isValid).toBe(true)
        })

        it('should reject tag with special characters', () => {
            const result = validateAmazonAssociateTag('my@site!')
            expect(result.isValid).toBe(false)
            expect(result.error).toContain('letters, numbers, hyphens, and underscores')
        })

        it('should reject tag with spaces', () => {
            const result = validateAmazonAssociateTag('my site')
            expect(result.isValid).toBe(false)
        })

        it('should reject empty tag', () => {
            const result = validateAmazonAssociateTag('')
            expect(result.isValid).toBe(false)
            expect(result.error).toContain('required')
        })

        it('should handle leading/trailing spaces', () => {
            const result = validateAmazonAssociateTag('  mysite-20  ')
            expect(result.isValid).toBe(true)
        })
    })
})

describe('Generic Validator', () => {
    describe('validateNonEmpty', () => {
        it('should accept non-empty string', () => {
            const result = validateNonEmpty('hello', 'Test Field')
            expect(result.isValid).toBe(true)
        })

        it('should reject empty string', () => {
            const result = validateNonEmpty('', 'Test Field')
            expect(result.isValid).toBe(false)
            expect(result.error).toContain('Test Field is required')
        })

        it('should reject whitespace-only string', () => {
            const result = validateNonEmpty('   ', 'Test Field')
            expect(result.isValid).toBe(false)
        })

        it('should use default field name if not provided', () => {
            const result = validateNonEmpty('')
            expect(result.isValid).toBe(false)
            expect(result.error).toContain('Field is required')
        })

        it('should accept string with spaces', () => {
            const result = validateNonEmpty('hello world', 'Test Field')
            expect(result.isValid).toBe(true)
        })
    })
})
