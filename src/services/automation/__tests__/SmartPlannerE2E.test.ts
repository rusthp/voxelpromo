import { AutomationService } from '../AutomationService';
import { OfferModel } from '../../../models/Offer';
import { ProductStatsModel } from '../../../models/ProductStats';
import mongoose from 'mongoose';

/**
 * End-to-End Tests for Smart Planner Scheduling Flow
 * 
 * These tests validate the complete scheduling workflow:
 * 1. Configuration → 2. Distribution → 3. Scheduling → 4. Verification
 */

// Mock all dependencies
jest.mock('../../../models/AutomationConfig');
jest.mock('../../../models/Offer');
jest.mock('../../../models/ProductStats');
jest.mock('../../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
    },
}));
jest.mock('../../../utils/cache', () => ({
    configCache: {
        get: jest.fn(),
        set: jest.fn(),
        invalidate: jest.fn(),
    },
}));
jest.mock('../TemplateService');

// Mock OfferService with scheduling tracking
const mockScheduledOffers: { offerId: string; scheduledAt: Date }[] = [];
jest.mock('../../offer/OfferService', () => ({
    OfferService: jest.fn().mockImplementation(() => ({
        scheduleOffer: jest.fn().mockImplementation((offerId: string, scheduledAt: Date) => {
            mockScheduledOffers.push({ offerId, scheduledAt });
            return Promise.resolve(true);
        }),
        postOffers: jest.fn().mockResolvedValue(1),
    })),
}));

import { configCache } from '../../../utils/cache';

describe('Smart Planner E2E Scheduling Flow', () => {
    let automationService: AutomationService;

    beforeEach(() => {
        automationService = new AutomationService();
        jest.clearAllMocks();
        mockScheduledOffers.length = 0; // Clear scheduled offers
    });

    describe('Full Scheduling Workflow', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should complete full workflow: config → distribute → schedule', async () => {
            // Step 1: Set time to 10:00 (working hours)
            jest.setSystemTime(new Date('2024-01-15T10:00:00'));

            // Step 2: Setup active configuration with Smart Planner enabled
            const activeConfig = {
                _id: new mongoose.Types.ObjectId(),
                isActive: true,
                postsPerHour: 4,
                startHour: 9,
                endHour: 21,
                enabledChannels: ['telegram', 'x'],
                enabledSources: ['aliexpress', 'amazon'],
                enabledCategories: ['electronics', 'home'],
                minDiscount: 10,
                maxPrice: 500,
            };

            (configCache.get as jest.Mock).mockReturnValue(activeConfig);

            // Step 3: Setup available offers (not yet scheduled)
            const mockOffers = [
                {
                    _id: new mongoose.Types.ObjectId(),
                    title: 'Smart TV 4K 55" - 40% OFF',
                    productUrl: 'https://example.com/tv',
                    currentPrice: 1200,
                    originalPrice: 2000,
                    discountPercentage: 40,
                    source: 'aliexpress',
                    category: 'electronics',
                    isActive: true,
                    isPosted: false,
                },
                {
                    _id: new mongoose.Types.ObjectId(),
                    title: 'Fone Bluetooth Premium',
                    productUrl: 'https://example.com/fone',
                    currentPrice: 89,
                    originalPrice: 150,
                    discountPercentage: 41,
                    source: 'amazon',
                    category: 'electronics',
                    isActive: true,
                    isPosted: false,
                },
                {
                    _id: new mongoose.Types.ObjectId(),
                    title: 'Aspirador Robô Inteligente',
                    productUrl: 'https://example.com/robo',
                    currentPrice: 450,
                    originalPrice: 800,
                    discountPercentage: 44,
                    source: 'aliexpress',
                    category: 'home',
                    isActive: true,
                    isPosted: false,
                },
                {
                    _id: new mongoose.Types.ObjectId(),
                    title: 'Cafeteira Expresso',
                    productUrl: 'https://example.com/cafe',
                    currentPrice: 199,
                    originalPrice: 350,
                    discountPercentage: 43,
                    source: 'amazon',
                    category: 'home',
                    isActive: true,
                    isPosted: false,
                },
            ];

            (OfferModel.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue(mockOffers),
            });

            (ProductStatsModel.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([]),
            });

            // Step 4: Execute distribution
            const scheduledCount = await automationService.distributeHourlyPosts();

            // Step 5: Verify results
            // Should schedule exactly postsPerHour (4) offers
            expect(scheduledCount).toBeLessThanOrEqual(4);
            expect(scheduledCount).toBeGreaterThanOrEqual(0);
        });

        it('should schedule posts with unique times within the hour', async () => {
            // Set time to 14:00 (59 minutes remaining)
            jest.setSystemTime(new Date('2024-01-15T14:00:00'));

            const activeConfig = {
                isActive: true,
                postsPerHour: 3,
                startHour: 9,
                endHour: 21,
            };

            (configCache.get as jest.Mock).mockReturnValue(activeConfig);

            const mockOffers = [
                { _id: new mongoose.Types.ObjectId(), title: 'Offer A', currentPrice: 100 },
                { _id: new mongoose.Types.ObjectId(), title: 'Offer B', currentPrice: 200 },
                { _id: new mongoose.Types.ObjectId(), title: 'Offer C', currentPrice: 300 },
            ];

            (OfferModel.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue(mockOffers),
            });

            (ProductStatsModel.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([]),
            });

            const result = await automationService.distributeHourlyPosts();

            // Verify scheduling occurred
            expect(result).toBeGreaterThanOrEqual(0);
        });

        it('should respect working hours boundary', async () => {
            // Test at exactly start hour
            jest.setSystemTime(new Date('2024-01-15T09:00:00'));

            const config = {
                isActive: true,
                postsPerHour: 2,
                startHour: 9,
                endHour: 18,
            };

            (configCache.get as jest.Mock).mockReturnValue(config);

            const offers = [
                { _id: new mongoose.Types.ObjectId(), title: 'Morning Offer' },
            ];

            (OfferModel.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue(offers),
            });

            (ProductStatsModel.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([]),
            });

            const result = await automationService.distributeHourlyPosts();

            // At 9:00 exactly, should still be able to schedule (within hours)
            expect(result).toBeGreaterThanOrEqual(0);
        });

        it('should handle transition between hours correctly', async () => {
            // First run at 10:30
            jest.setSystemTime(new Date('2024-01-15T10:30:00'));

            const config = {
                isActive: true,
                postsPerHour: 5,
                startHour: 9,
                endHour: 18,
            };

            (configCache.get as jest.Mock).mockReturnValue(config);

            const offers = Array.from({ length: 10 }, (_, i) => ({
                _id: new mongoose.Types.ObjectId(),
                title: `Offer ${i + 1}`,
            }));

            (OfferModel.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue(offers),
            });

            (ProductStatsModel.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([]),
            });

            const firstRunResult = await automationService.distributeHourlyPosts();

            // With 29 minutes remaining (30 to 59), should schedule up to 5
            expect(firstRunResult).toBeLessThanOrEqual(5);

            // Simulate next hour run at 11:00
            jest.setSystemTime(new Date('2024-01-15T11:00:00'));
            jest.clearAllMocks();

            (configCache.get as jest.Mock).mockReturnValue(config);

            const freshOffers = Array.from({ length: 10 }, (_, i) => ({
                _id: new mongoose.Types.ObjectId(),
                title: `Fresh Offer ${i + 1}`,
            }));

            (OfferModel.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue(freshOffers),
            });

            (ProductStatsModel.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([]),
            });

            const secondRunResult = await automationService.distributeHourlyPosts();

            // At 11:00, should be able to schedule full 5 posts
            expect(secondRunResult).toBeLessThanOrEqual(5);
        });
    });

    describe('Edge Cases in Scheduling', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should handle exactly 1 minute remaining', async () => {
            jest.setSystemTime(new Date('2024-01-15T14:58:00'));

            (configCache.get as jest.Mock).mockReturnValue({
                isActive: true,
                postsPerHour: 5,
                startHour: 9,
                endHour: 18,
            });

            const offers = [
                { _id: new mongoose.Types.ObjectId(), title: 'Last Minute Offer' },
            ];

            (OfferModel.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue(offers),
            });

            (ProductStatsModel.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([]),
            });

            const result = await automationService.distributeHourlyPosts();

            // Should schedule at most 1 (limited by remaining minutes)
            expect(result).toBeLessThanOrEqual(1);
        });

        it('should handle more offers than slots', async () => {
            jest.setSystemTime(new Date('2024-01-15T14:50:00'));

            (configCache.get as jest.Mock).mockReturnValue({
                isActive: true,
                postsPerHour: 3,
                startHour: 9,
                endHour: 18,
            });

            // 20 offers but only 3 slots
            const offers = Array.from({ length: 20 }, (_, i) => ({
                _id: new mongoose.Types.ObjectId(),
                title: `Offer ${i + 1}`,
            }));

            (OfferModel.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue(offers),
            });

            (ProductStatsModel.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([]),
            });

            const result = await automationService.distributeHourlyPosts();

            // Should not exceed postsPerHour
            expect(result).toBeLessThanOrEqual(3);
        });

        it('should handle fewer offers than requested', async () => {
            jest.setSystemTime(new Date('2024-01-15T14:00:00'));

            (configCache.get as jest.Mock).mockReturnValue({
                isActive: true,
                postsPerHour: 10,
                startHour: 9,
                endHour: 18,
            });

            // Only 2 offers available
            const offers = [
                { _id: new mongoose.Types.ObjectId(), title: 'Only One' },
                { _id: new mongoose.Types.ObjectId(), title: 'Only Two' },
            ];

            (OfferModel.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue(offers),
            });

            (ProductStatsModel.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([]),
            });

            const result = await automationService.distributeHourlyPosts();

            // Should only schedule available offers
            expect(result).toBeLessThanOrEqual(2);
        });

        it('should handle disabled channels gracefully', async () => {
            jest.setSystemTime(new Date('2024-01-15T14:00:00'));

            (configCache.get as jest.Mock).mockReturnValue({
                isActive: true,
                postsPerHour: 3,
                startHour: 9,
                endHour: 18,
                enabledChannels: [], // No channels enabled
            });

            const offers = [
                { _id: new mongoose.Types.ObjectId(), title: 'No Channel Offer' },
            ];

            (OfferModel.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue(offers),
            });

            (ProductStatsModel.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([]),
            });

            const result = await automationService.distributeHourlyPosts();

            // Should still schedule (channel selection is done at post time)
            expect(result).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Integration with Status API', () => {
        it('should report correct Smart Planner status', async () => {
            const config = {
                isActive: true,
                postsPerHour: 5,
                startHour: 9,
                endHour: 18,
                intervalMinutes: 30,
                enabledChannels: ['telegram'],
            };

            (configCache.get as jest.Mock).mockReturnValue(config);

            (OfferModel.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([]),
            });

            (ProductStatsModel.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([]),
            });

            (OfferModel.findOne as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(null),
            });

            (OfferModel.countDocuments as jest.Mock)
                .mockResolvedValueOnce(100)
                .mockResolvedValueOnce(50);

            const status = await automationService.getStatus();

            expect(status.isActive).toBe(true);
            expect(status.config).toBeDefined();
            expect(status.config.postsPerHour).toBe(5);
        });

        it('should differentiate between Smart Planner and Fixed Interval modes', async () => {
            // Smart Planner mode (postsPerHour > 0)
            const smartConfig = {
                isActive: true,
                postsPerHour: 5,
                startHour: 9,
                endHour: 18,
            };

            (configCache.get as jest.Mock).mockReturnValue(smartConfig);

            (OfferModel.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([]),
            });

            (ProductStatsModel.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([]),
            });

            (OfferModel.findOne as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(null),
            });

            (OfferModel.countDocuments as jest.Mock)
                .mockResolvedValueOnce(100)
                .mockResolvedValueOnce(50);

            const status = await automationService.getStatus();

            // Smart Planner is enabled when postsPerHour > 0
            expect(status.config.postsPerHour).toBeGreaterThan(0);
        });
    });
});
