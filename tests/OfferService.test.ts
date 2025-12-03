import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { OfferService } from '../src/services/offer/OfferService';
import { Offer } from '../src/types';
import { connectDatabase, disconnectDatabase } from '../src/config/database';

describe('OfferService', () => {
    let offerService: OfferService;

    beforeAll(async () => {
        // Connect to test database
        process.env.MONGODB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/voxelpromo_test';
        await connectDatabase();
        offerService = new OfferService();
    });

    afterAll(async () => {
        await disconnectDatabase();
    });

    describe('saveOffer', () => {
        it('should save a new offer', async () => {
            const offer: Offer = {
                title: 'Test Product',
                description: 'Test Description',
                originalPrice: 100,
                currentPrice: 50,
                discount: 50,
                discountPercentage: 50,
                currency: 'BRL',
                imageUrl: 'https://example.com/image.jpg',
                productUrl: 'https://example.com/product',
                affiliateUrl: 'https://example.com/affiliate',
                source: 'manual',
                category: 'test',
                isActive: true,
                isPosted: false,
                postedChannels: [],
                tags: [],
                coupons: [],
            };

            const saved = await offerService.saveOffer(offer);

            expect(saved).toBeDefined();
            expect(saved._id).toBeDefined();
            expect(saved.title).toBe(offer.title);
            expect(saved.discountPercentage).toBe(50);
        });

        it('should validate numeric fields', async () => {
            const invalidOffer: any = {
                title: 'Test Product',
                description: 'Test Description',
                originalPrice: NaN,
                currentPrice: -10,
                discount: NaN,
                discountPercentage: NaN,
                imageUrl: 'https://example.com/image.jpg',
                productUrl: 'https://example.com/product-2',
                affiliateUrl: 'https://example.com/affiliate-2',
                source: 'manual',
                category: 'test',
            };

            const saved = await offerService.saveOffer(invalidOffer);

            expect(saved.originalPrice).toBe(0);
            expect(saved.currentPrice).toBe(0);
            expect(saved.discountPercentage).toBe(0);
        });

        it('should update existing offer', async () => {
            const offer: Offer = {
                title: 'Updated Product',
                description: 'Updated Description',
                originalPrice: 200,
                currentPrice: 100,
                discount: 100,
                discountPercentage: 50,
                currency: 'BRL',
                imageUrl: 'https://example.com/image.jpg',
                productUrl: 'https://example.com/update-test',
                affiliateUrl: 'https://example.com/affiliate',
                source: 'manual',
                category: 'test',
                isActive: true,
                isPosted: false,
                postedChannels: [],
                tags: [],
                coupons: [],
            };

            // Save first time
            await offerService.saveOffer(offer);

            // Update
            offer.currentPrice = 80;
            offer.discountPercentage = 60;
            const updated = await offerService.saveOffer(offer);

            expect(updated.currentPrice).toBe(80);
            expect(updated.discountPercentage).toBe(60);
        });
    });

    describe('filterOffers', () => {
        it('should filter by minimum discount', async () => {
            const offers = await offerService.filterOffers({ minDiscount: 40 });

            expect(Array.isArray(offers)).toBe(true);
            offers.forEach(offer => {
                expect(offer.discountPercentage).toBeGreaterThanOrEqual(40);
            });
        });

        it('should filter by source', async () => {
            const offers = await offerService.filterOffers({ sources: ['manual'] });

            expect(Array.isArray(offers)).toBe(true);
            offers.forEach(offer => {
                expect(offer.source).toBe('manual');
            });
        });
    });

    describe('getStatistics', () => {
        it('should return statistics', async () => {
            const stats = await offerService.getStatistics();

            expect(stats).toBeDefined();
            expect(typeof stats.total).toBe('number');
            expect(typeof stats.posted).toBe('number');
            expect(typeof stats.notPosted).toBe('number');
            expect(Array.isArray(stats.bySource)).toBe(true);
            expect(Array.isArray(stats.byCategory)).toBe(true);
        });
    });
});
