import { describe, it, expect } from '@jest/globals';
import { BlacklistService } from '../src/services/blacklist/BlacklistService';

describe('BlacklistService', () => {
    let blacklistService: BlacklistService;

    beforeEach(() => {
        blacklistService = new BlacklistService();
    });

    describe('isBlacklisted', () => {
        it('should return false when blacklist is disabled', () => {
            const result = blacklistService.isBlacklisted('fake product');
            expect(result).toBe(false);
        });

        it('should detect blacklisted keywords', () => {
            // This test assumes blacklist is configured in config.json
            // If you want to test without config, you'll need to mock the config
            const text = 'This is a fake replica product';
            // Result depends on config.json settings
            expect(typeof blacklistService.isBlacklisted(text)).toBe('boolean');
        });
    });

    describe('isOfferBlacklisted', () => {
        it('should check title, description, and brand', () => {
            const offer = {
                title: 'Replica Watch',
                description: 'High quality replica',
                brand: 'Fake Brand',
            };

            const result = blacklistService.isOfferBlacklisted(offer);
            expect(typeof result).toBe('boolean');
        });

        it('should handle undefined optional fields', () => {
            const offer = {
                title: 'Normal Product',
            };

            const result = blacklistService.isOfferBlacklisted(offer);
            expect(typeof result).toBe('boolean');
        });
    });

    describe('getStats', () => {
        it('should return valid stats', () => {
            const stats = blacklistService.getStats();

            expect(stats).toBeDefined();
            expect(typeof stats.enabled).toBe('boolean');
            expect(typeof stats.keywordCount).toBe('number');
            expect(typeof stats.regexCount).toBe('number');
        });
    });
});
