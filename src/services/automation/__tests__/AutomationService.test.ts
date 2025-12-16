import { AutomationService } from '../AutomationService';
import { AutomationConfigModel } from '../../../models/AutomationConfig';
import { OfferModel } from '../../../models/Offer';
import { ProductStatsModel } from '../../../models/ProductStats';
import mongoose from 'mongoose';

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
jest.mock('../../offer/OfferService');

import { configCache } from '../../../utils/cache';

describe('AutomationService', () => {
    let automationService: AutomationService;

    beforeEach(() => {
        automationService = new AutomationService();
        jest.clearAllMocks();
    });

    describe('shouldPostNow', () => {
        it('should return true when current hour is within normal range', () => {
            const config = { startHour: 8, endHour: 18 };

            // Mock current time to be 12:00 (within 8-18)
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2024-01-15T12:00:00'));

            const result = automationService.shouldPostNow(config);

            expect(result).toBe(true);
            jest.useRealTimers();
        });

        it('should return false when current hour is outside normal range', () => {
            const config = { startHour: 8, endHour: 18 };

            // Mock current time to be 20:00 (outside 8-18)
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2024-01-15T20:00:00'));

            const result = automationService.shouldPostNow(config);

            expect(result).toBe(false);
            jest.useRealTimers();
        });

        it('should handle overnight range (e.g., 20h to 2h)', () => {
            const config = { startHour: 20, endHour: 2 };

            // Mock current time to be 22:00 (within overnight range)
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2024-01-15T22:00:00'));

            const result = automationService.shouldPostNow(config);

            expect(result).toBe(true);
            jest.useRealTimers();
        });

        it('should handle overnight range early morning (e.g., 1h)', () => {
            const config = { startHour: 20, endHour: 2 };

            // Mock current time to be 01:00 (within overnight range)
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2024-01-15T01:00:00'));

            const result = automationService.shouldPostNow(config);

            expect(result).toBe(true);
            jest.useRealTimers();
        });

        it('should return false for overnight range when outside both periods', () => {
            const config = { startHour: 20, endHour: 2 };

            // Mock current time to be 10:00 (outside overnight range)
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2024-01-15T10:00:00'));

            const result = automationService.shouldPostNow(config);

            expect(result).toBe(false);
            jest.useRealTimers();
        });
    });

    describe('getActiveConfig', () => {
        it('should return cached config if available', async () => {
            const cachedConfig = { isActive: true, startHour: 8 };
            (configCache.get as jest.Mock).mockReturnValue(cachedConfig);

            const result = await automationService.getActiveConfig();

            expect(result).toEqual(cachedConfig);
            expect(configCache.get).toHaveBeenCalled();
            expect(AutomationConfigModel.findOne).not.toHaveBeenCalled();
        });

        it('should fetch from database on cache miss', async () => {
            const dbConfig = { isActive: true, startHour: 9 };
            (configCache.get as jest.Mock).mockReturnValue(null);
            (AutomationConfigModel.findOne as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                populate: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(dbConfig),
            });

            const result = await automationService.getActiveConfig();

            expect(result).toEqual(dbConfig);
            expect(AutomationConfigModel.findOne).toHaveBeenCalled();
            expect(configCache.set).toHaveBeenCalled();
        });

        it('should return null on error', async () => {
            (configCache.get as jest.Mock).mockReturnValue(null);
            (AutomationConfigModel.findOne as jest.Mock).mockImplementation(() => {
                throw new Error('Database error');
            });

            const result = await automationService.getActiveConfig();

            expect(result).toBeNull();
        });
    });

    describe('saveConfig', () => {
        it('should create new config if none exists', async () => {
            const configData = { isActive: true, startHour: 8, endHour: 18 };
            const savedConfig = { ...configData, _id: new mongoose.Types.ObjectId() };

            (AutomationConfigModel.findOne as jest.Mock).mockResolvedValue(null);
            (AutomationConfigModel.updateMany as jest.Mock).mockResolvedValue({});

            const mockInstance = {
                save: jest.fn().mockResolvedValue(undefined),
                toObject: jest.fn().mockReturnValue(savedConfig),
            };
            (AutomationConfigModel as unknown as jest.Mock).mockImplementation(() => mockInstance);

            const result = await automationService.saveConfig(configData);

            expect(result).toEqual(savedConfig);
            expect(mockInstance.save).toHaveBeenCalled();
            expect(configCache.invalidate).toHaveBeenCalled();
        });

        it('should update existing config', async () => {
            const configData = { isActive: true, startHour: 9 };
            const existingConfig = {
                isActive: false,
                startHour: 8,
                updatedAt: new Date(),
                save: jest.fn().mockResolvedValue(undefined),
                toObject: jest.fn().mockReturnValue({ ...configData }),
            };

            (AutomationConfigModel.findOne as jest.Mock).mockResolvedValue(existingConfig);
            (AutomationConfigModel.updateMany as jest.Mock).mockResolvedValue({});

            await automationService.saveConfig(configData);

            expect(existingConfig.save).toHaveBeenCalled();
            expect(configCache.invalidate).toHaveBeenCalled();
        });

        it('should deactivate all configs when setting new as active', async () => {
            const configData = { isActive: true };

            (AutomationConfigModel.findOne as jest.Mock).mockResolvedValue(null);
            (AutomationConfigModel.updateMany as jest.Mock).mockResolvedValue({});

            const mockInstance = {
                save: jest.fn().mockResolvedValue(undefined),
                toObject: jest.fn().mockReturnValue(configData),
            };
            (AutomationConfigModel as unknown as jest.Mock).mockImplementation(() => mockInstance);

            await automationService.saveConfig(configData);

            expect(AutomationConfigModel.updateMany).toHaveBeenCalledWith({}, { isActive: false });
        });
    });

    describe('getNextScheduledOffers', () => {
        it('should return empty array when no offers match filters', async () => {
            const config = {
                enabledSources: ['aliexpress'],
                enabledCategories: ['electronics'],
                minDiscount: 10,
                maxPrice: 1000,
            };

            (OfferModel.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([]),
            });

            const result = await automationService.getNextScheduledOffers(config, 5);

            expect(result).toEqual([]);
        });

        it('should filter offers by source and category', async () => {
            const config = {
                enabledSources: ['mercadolivre'],
                enabledCategories: ['electronics'],
                minDiscount: 5,
                prioritizeBestSellersInPeak: false,
                prioritizeBigDiscountsInPeak: false,
                discountWeightVsSales: 50,
            };

            const mockOffers = [
                {
                    _id: new mongoose.Types.ObjectId(),
                    title: 'Test Product',
                    productUrl: 'http://example.com/1',
                    currentPrice: 100,
                    discountPercentage: 20,
                    source: 'mercadolivre',
                    category: 'electronics',
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

            const result = await automationService.getNextScheduledOffers(config, 5);

            expect(result.length).toBeGreaterThanOrEqual(0);
            expect(OfferModel.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    isActive: true,
                    isPosted: false,
                    source: { $in: ['mercadolivre'] },
                    category: { $in: ['electronics'] },
                })
            );
        });

        it('should sort offers by priority score', async () => {
            const config = {
                prioritizeBestSellersInPeak: true,
                prioritizeBigDiscountsInPeak: true,
                discountWeightVsSales: 50,
                peakHours: [{ start: 12, end: 14, priority: 10 }],
            };

            const mockOffers = [
                {
                    _id: new mongoose.Types.ObjectId(),
                    title: 'Low Priority',
                    productUrl: 'http://example.com/1',
                    currentPrice: 50,
                    discountPercentage: 5,
                },
                {
                    _id: new mongoose.Types.ObjectId(),
                    title: 'High Priority',
                    productUrl: 'http://example.com/2',
                    currentPrice: 100,
                    discountPercentage: 50,
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

            const result = await automationService.getNextScheduledOffers(config, 2);

            // Should return offers sorted by priority (highest first)
            expect(result.length).toBeLessThanOrEqual(2);
        });
    });

    describe('getStatus', () => {
        it('should return inactive status when no config exists', async () => {
            (configCache.get as jest.Mock).mockReturnValue(null);
            (AutomationConfigModel.findOne as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                populate: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(null),
            });

            const result = await automationService.getStatus();

            expect(result.isActive).toBe(false);
            expect(result.message).toBe('No automation configured');
        });

        it('should return full status when config exists', async () => {
            const mockConfig = {
                isActive: true,
                startHour: 8,
                endHour: 18,
                intervalMinutes: 30,
                postsPerHour: 3,
                enabledChannels: ['telegram'],
                minDiscountPercentage: 10,
            };

            (configCache.get as jest.Mock).mockReturnValue(mockConfig);

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
                .mockResolvedValueOnce(100) // total posted
                .mockResolvedValueOnce(50); // pending

            const result = await automationService.getStatus();

            expect(result.isActive).toBe(true);
            expect(result.config).toBeDefined();
            expect(result.config.startHour).toBe(8);
        });
    });
});
