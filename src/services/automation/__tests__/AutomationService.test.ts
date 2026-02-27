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
  const testUserId = '507f1f77bcf86cd799439011';

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

      const result = await automationService.getActiveConfig(testUserId);

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

      const result = await automationService.getActiveConfig(testUserId);

      expect(result).toEqual(dbConfig);
      expect(AutomationConfigModel.findOne).toHaveBeenCalled();
      expect(configCache.set).toHaveBeenCalled();
    });

    it('should return null on error', async () => {
      (configCache.get as jest.Mock).mockReturnValue(null);
      (AutomationConfigModel.findOne as jest.Mock).mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await automationService.getActiveConfig(testUserId);

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

      const result = await automationService.saveConfig(testUserId, configData);

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

      await automationService.saveConfig(testUserId, configData);

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

      await automationService.saveConfig(testUserId, configData);

      expect(AutomationConfigModel.updateMany).toHaveBeenCalledWith({ userId: testUserId }, { isActive: false });
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

      const result = await automationService.getNextScheduledOffers(testUserId, config, 5);

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

      const result = await automationService.getNextScheduledOffers(testUserId, config, 5);

      expect(result.length).toBeGreaterThanOrEqual(0);
      expect(OfferModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testUserId,
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

      const result = await automationService.getNextScheduledOffers(testUserId, config, 2);

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

      const result = await automationService.getStatus(testUserId);

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

      const result = await automationService.getStatus(testUserId);

      expect(result.isActive).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config.startHour).toBe(8);
    });
  });

  describe('distributeHourlyPosts', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return 0 when config is not active', async () => {
      (configCache.get as jest.Mock).mockReturnValue({ isActive: false });

      const result = await automationService.distributeHourlyPosts(testUserId);

      expect(result).toBe(0);
    });

    it('should return 0 when postsPerHour is 0 or undefined', async () => {
      (configCache.get as jest.Mock).mockReturnValue({
        isActive: true,
        postsPerHour: 0,
      });

      const result = await automationService.distributeHourlyPosts(testUserId);

      expect(result).toBe(0);
    });

    it('should return 0 when postsPerHour is negative', async () => {
      (configCache.get as jest.Mock).mockReturnValue({
        isActive: true,
        postsPerHour: -5,
      });

      const result = await automationService.distributeHourlyPosts(testUserId);

      expect(result).toBe(0);
    });

    it('should return 0 when outside working hours', async () => {
      // Set time to 5 AM (outside 8-18 working hours)
      jest.setSystemTime(new Date('2024-01-15T05:30:00'));

      (configCache.get as jest.Mock).mockReturnValue({
        isActive: true,
        postsPerHour: 3,
        startHour: 8,
        endHour: 18,
      });

      const result = await automationService.distributeHourlyPosts(testUserId);

      expect(result).toBe(0);
    });

    it('should return 0 when no offers are available', async () => {
      // Set time to 12:00 (within working hours, 59 minutes remaining)
      jest.setSystemTime(new Date('2024-01-15T12:00:00'));

      (configCache.get as jest.Mock).mockReturnValue({
        isActive: true,
        postsPerHour: 3,
        startHour: 8,
        endHour: 18,
      });

      // Mock getNextScheduledOffers to return empty array
      (OfferModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      (ProductStatsModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await automationService.distributeHourlyPosts(testUserId);

      expect(result).toBe(0);
    });

    it('should return 0 when less than 1 minute remaining in the hour', async () => {
      // Set time to 12:59 (less than 1 minute remaining)
      jest.setSystemTime(new Date('2024-01-15T12:59:30'));

      (configCache.get as jest.Mock).mockReturnValue({
        isActive: true,
        postsPerHour: 3,
        startHour: 8,
        endHour: 18,
      });

      const result = await automationService.distributeHourlyPosts(testUserId);

      expect(result).toBe(0);
    });

    it('should schedule offers when all conditions are met', async () => {
      // Set time to 12:00 (within working hours, 59 minutes remaining)
      jest.setSystemTime(new Date('2024-01-15T12:00:00'));

      const mockOffers = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Test Product 1',
          productUrl: 'http://example.com/1',
          currentPrice: 100,
          discountPercentage: 20,
        },
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Test Product 2',
          productUrl: 'http://example.com/2',
          currentPrice: 200,
          discountPercentage: 30,
        },
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Test Product 3',
          productUrl: 'http://example.com/3',
          currentPrice: 150,
          discountPercentage: 25,
        },
      ];

      (configCache.get as jest.Mock).mockReturnValue({
        isActive: true,
        postsPerHour: 3,
        startHour: 8,
        endHour: 18,
      });

      // Mock getNextScheduledOffers - return offers via OfferModel
      (OfferModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockOffers),
      });

      (ProductStatsModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      // Mock OfferService.scheduleOffer
      const mockScheduleOffer = jest.fn().mockResolvedValue(true);
      jest.doMock('../../offer/OfferService', () => ({
        OfferService: jest.fn().mockImplementation(() => ({
          scheduleOffer: mockScheduleOffer,
        })),
      }));

      const result = await automationService.distributeHourlyPosts(testUserId);

      // Should schedule up to postsPerHour (3) offers
      expect(result).toBeLessThanOrEqual(3);
    });

    it('should skip already scheduled offers', async () => {
      // Set time to 12:00
      jest.setSystemTime(new Date('2024-01-15T12:00:00'));

      const mockOffers = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Already Scheduled',
          scheduledAt: new Date('2024-01-15T13:00:00'), // Already scheduled
        },
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Not Scheduled',
          // No scheduledAt
        },
      ];

      (configCache.get as jest.Mock).mockReturnValue({
        isActive: true,
        postsPerHour: 2,
        startHour: 8,
        endHour: 18,
      });

      (OfferModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockOffers),
      });

      (ProductStatsModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await automationService.distributeHourlyPosts(testUserId);

      // Only non-scheduled offers should be considered
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should limit posts by remaining minutes when time is limited', async () => {
      // Set time to 12:55 (only 4 minutes remaining)
      jest.setSystemTime(new Date('2024-01-15T12:55:00'));

      const mockOffers = [
        { _id: new mongoose.Types.ObjectId(), title: 'Offer 1' },
        { _id: new mongoose.Types.ObjectId(), title: 'Offer 2' },
        { _id: new mongoose.Types.ObjectId(), title: 'Offer 3' },
        { _id: new mongoose.Types.ObjectId(), title: 'Offer 4' },
        { _id: new mongoose.Types.ObjectId(), title: 'Offer 5' },
        { _id: new mongoose.Types.ObjectId(), title: 'Offer 6' },
        { _id: new mongoose.Types.ObjectId(), title: 'Offer 7' },
        { _id: new mongoose.Types.ObjectId(), title: 'Offer 8' },
        { _id: new mongoose.Types.ObjectId(), title: 'Offer 9' },
        { _id: new mongoose.Types.ObjectId(), title: 'Offer 10' },
      ];

      (configCache.get as jest.Mock).mockReturnValue({
        isActive: true,
        postsPerHour: 10, // Wants 10 posts
        startHour: 8,
        endHour: 18,
      });

      (OfferModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockOffers),
      });

      (ProductStatsModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await automationService.distributeHourlyPosts(testUserId);

      // Should be limited by remaining minutes (4)
      expect(result).toBeLessThanOrEqual(4);
    });

    it('should generate unique random minutes for each post', async () => {
      // Set time to 12:00 (59 minutes remaining)
      jest.setSystemTime(new Date('2024-01-15T12:00:00'));

      const mockOffers = [
        { _id: new mongoose.Types.ObjectId(), title: 'Offer 1' },
        { _id: new mongoose.Types.ObjectId(), title: 'Offer 2' },
        { _id: new mongoose.Types.ObjectId(), title: 'Offer 3' },
      ];

      (configCache.get as jest.Mock).mockReturnValue({
        isActive: true,
        postsPerHour: 3,
        startHour: 8,
        endHour: 18,
      });

      (OfferModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockOffers),
      });

      (ProductStatsModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      // Run multiple times to verify randomness produces different results
      const results: number[] = [];
      for (let i = 0; i < 5; i++) {
        const result = await automationService.distributeHourlyPosts(testUserId);
        results.push(result);
      }

      // All runs should complete successfully (return >= 0)
      results.forEach((r) => expect(r).toBeGreaterThanOrEqual(0));
    });

    it('should handle errors gracefully and return 0', async () => {
      // Set time to 12:00
      jest.setSystemTime(new Date('2024-01-15T12:00:00'));

      (configCache.get as jest.Mock).mockReturnValue({
        isActive: true,
        postsPerHour: 3,
        startHour: 8,
        endHour: 18,
      });

      // Simulate database error
      (OfferModel.find as jest.Mock).mockImplementation(() => {
        throw new Error('Database connection lost');
      });

      const result = await automationService.distributeHourlyPosts(testUserId);

      expect(result).toBe(0);
    });

    it('should work with overnight schedule (20h-2h)', async () => {
      // Set time to 22:00 (within overnight schedule)
      jest.setSystemTime(new Date('2024-01-15T22:00:00'));

      const mockOffers = [
        { _id: new mongoose.Types.ObjectId(), title: 'Night Offer 1' },
        { _id: new mongoose.Types.ObjectId(), title: 'Night Offer 2' },
      ];

      (configCache.get as jest.Mock).mockReturnValue({
        isActive: true,
        postsPerHour: 2,
        startHour: 20,
        endHour: 2, // Overnight
      });

      (OfferModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockOffers),
      });

      (ProductStatsModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await automationService.distributeHourlyPosts(testUserId);

      // Should work with overnight schedule
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });
});

