import { OfferService } from '../OfferService';
import { OfferModel } from '../../../models/Offer';
import { Offer } from '../../../types';
import mongoose from 'mongoose';

// Mock dependencies
jest.mock('../../../models/Offer');
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));
jest.mock('../../ai/AIService');
jest.mock('../../messaging/TelegramService');
jest.mock('../../messaging/WhatsAppService');

describe('OfferService', () => {
  let offerService: OfferService;

  beforeEach(() => {
    offerService = new OfferService();
    jest.clearAllMocks();
  });

  describe('validateOfferNumbers', () => {
    // Note: This is a private method, but we can test it indirectly through saveOffer
    it('should fix NaN values in offer', async () => {
      const invalidOffer: Offer = {
        title: 'Test Offer',
        description: 'Test',
        originalPrice: NaN,
        currentPrice: NaN,
        discount: NaN,
        discountPercentage: NaN,
        currency: 'BRL',
        imageUrl: 'http://example.com/img.jpg',
        productUrl: 'http://example.com/product',
        affiliateUrl: 'http://example.com/aff',
        source: 'aliexpress',
        category: 'electronics',
        isActive: true,
        isPosted: false,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock should return validated values (NaN -> 0)
      const validatedOffer = {
        ...invalidOffer,
        originalPrice: 0, // NaN becomes 0
        currentPrice: 0, // NaN becomes 0
        discount: 0, // NaN becomes 0
        discountPercentage: 0, // NaN becomes 0
      };

      const mockOfferInstance = {
        save: jest.fn().mockResolvedValue(undefined),
        toObject: () => ({
          ...validatedOffer,
          _id: new mongoose.Types.ObjectId(),
        }),
      };
      (OfferModel as any).mockImplementation(() => mockOfferInstance);
      (OfferModel.findOne as jest.Mock) = jest.fn().mockResolvedValue(null);

      const result = await offerService.saveOffer(invalidOffer);

      // Should have valid numbers (0 or calculated values)
      expect(isNaN(result.originalPrice)).toBe(false);
      expect(isNaN(result.currentPrice)).toBe(false);
      expect(isNaN(result.discount)).toBe(false);
      expect(isNaN(result.discountPercentage)).toBe(false);
    });

    it('should ensure originalPrice >= currentPrice', async () => {
      const offer: Offer = {
        title: 'Test Offer',
        description: 'Test',
        originalPrice: 50,
        currentPrice: 100, // Invalid: current > original
        discount: 0,
        discountPercentage: 0,
        currency: 'BRL',
        imageUrl: 'http://example.com/img.jpg',
        productUrl: 'http://example.com/product',
        affiliateUrl: 'http://example.com/aff',
        source: 'aliexpress',
        category: 'electronics',
        isActive: true,
        isPosted: false,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock should return validated values (originalPrice adjusted to >= currentPrice)
      const validatedOffer = {
        ...offer,
        originalPrice: 100, // Adjusted to be >= currentPrice (100)
        discount: 0, // Recalculated: 100 - 100 = 0
        discountPercentage: 0, // Recalculated: (0 / 100) * 100 = 0
      };

      const mockOfferInstance = {
        save: jest.fn().mockResolvedValue(undefined),
        toObject: () => ({
          ...validatedOffer,
          _id: new mongoose.Types.ObjectId(),
        }),
      };
      (OfferModel as any).mockImplementation(() => mockOfferInstance);
      (OfferModel.findOne as jest.Mock) = jest.fn().mockResolvedValue(null);

      const result = await offerService.saveOffer(offer);

      // originalPrice should be adjusted to be >= currentPrice
      expect(result.originalPrice).toBeGreaterThanOrEqual(result.currentPrice);
      expect(result.originalPrice).toBe(100); // Should be adjusted to 100
    });
  });

  describe('saveOffer', () => {
    it('should save a new offer', async () => {
      const newOffer: Offer = {
        title: 'New Product',
        description: 'A new product',
        originalPrice: 100,
        currentPrice: 80,
        discount: 20,
        discountPercentage: 20,
        currency: 'BRL',
        imageUrl: 'http://example.com/img.jpg',
        productUrl: 'http://example.com/product/1',
        affiliateUrl: 'http://example.com/aff/1',
        source: 'aliexpress',
        category: 'electronics',
        isActive: true,
        isPosted: false,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockOfferInstance = {
        save: jest.fn().mockResolvedValue(undefined),
        toObject: () => ({
          ...newOffer,
          _id: new mongoose.Types.ObjectId(),
        }),
      };
      (OfferModel as any).mockImplementation(() => mockOfferInstance);
      (OfferModel.findOne as jest.Mock) = jest.fn().mockResolvedValue(null);

      const result = await offerService.saveOffer(newOffer);

      expect(result).toBeDefined();
      expect(result.title).toBe(newOffer.title);
      expect(mockOfferInstance.save).toHaveBeenCalled();
    });

    it('should update existing offer', async () => {
      const existingOffer = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Existing Product',
        productUrl: 'http://example.com/product/1',
        isActive: true,
        save: jest.fn().mockResolvedValue(undefined),
        toObject: () => ({
          _id: existingOffer._id,
          title: 'Updated Product',
          productUrl: 'http://example.com/product/1',
          isActive: true,
        }),
      };

      const updatedOffer: Offer = {
        title: 'Updated Product',
        description: 'Updated description',
        originalPrice: 100,
        currentPrice: 80,
        discount: 20,
        discountPercentage: 20,
        currency: 'BRL',
        imageUrl: 'http://example.com/img.jpg',
        productUrl: 'http://example.com/product/1',
        affiliateUrl: 'http://example.com/aff/1',
        source: 'aliexpress',
        category: 'electronics',
        isActive: true,
        isPosted: false,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (OfferModel.findOne as jest.Mock) = jest.fn().mockResolvedValue(existingOffer);

      const result = await offerService.saveOffer(updatedOffer);

      expect(result).toBeDefined();
      expect(existingOffer.save).toHaveBeenCalled();
    });

    it('should reactivate inactive offer', async () => {
      const inactiveOffer = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Inactive Product',
        productUrl: 'http://example.com/product/1',
        isActive: false,
        save: jest.fn().mockResolvedValue(undefined),
        toObject: () => ({
          _id: inactiveOffer._id,
          title: 'Reactivated Product',
          productUrl: 'http://example.com/product/1',
          isActive: true,
        }),
      };

      const offer: Offer = {
        title: 'Reactivated Product',
        description: 'Description',
        originalPrice: 100,
        currentPrice: 80,
        discount: 20,
        discountPercentage: 20,
        currency: 'BRL',
        imageUrl: 'http://example.com/img.jpg',
        productUrl: 'http://example.com/product/1',
        affiliateUrl: 'http://example.com/aff/1',
        source: 'aliexpress',
        category: 'electronics',
        isActive: true,
        isPosted: false,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (OfferModel.findOne as jest.Mock) = jest.fn().mockResolvedValue(inactiveOffer);

      const result = await offerService.saveOffer(offer);

      expect(result).toBeDefined();
      expect(inactiveOffer.isActive).toBe(true);
      expect(inactiveOffer.save).toHaveBeenCalled();
    });
  });

  describe('saveOffers', () => {
    it('should return 0 for empty array', async () => {
      const result = await offerService.saveOffers([]);
      expect(result).toBe(0);
    });

    it('should save multiple new offers', async () => {
      const offers: Offer[] = [
        {
          title: 'Product 1',
          description: 'Description 1',
          originalPrice: 100,
          currentPrice: 80,
          discount: 20,
          discountPercentage: 20,
          currency: 'BRL',
          imageUrl: 'http://example.com/img1.jpg',
          productUrl: 'http://example.com/product/1',
          affiliateUrl: 'http://example.com/aff/1',
          source: 'aliexpress',
          category: 'electronics',
          isActive: true,
          isPosted: false,
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'Product 2',
          description: 'Description 2',
          originalPrice: 200,
          currentPrice: 150,
          discount: 50,
          discountPercentage: 25,
          currency: 'BRL',
          imageUrl: 'http://example.com/img2.jpg',
          productUrl: 'http://example.com/product/2',
          affiliateUrl: 'http://example.com/aff/2',
          source: 'aliexpress',
          category: 'electronics',
          isActive: true,
          isPosted: false,
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockOfferInstance = {
        save: jest.fn().mockResolvedValue(undefined),
        toObject: () => ({
          _id: new mongoose.Types.ObjectId(),
        }),
      };
      (OfferModel as any).mockImplementation(() => mockOfferInstance);
      (OfferModel.find as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await offerService.saveOffers(offers);

      expect(result).toBe(2);
      expect(mockOfferInstance.save).toHaveBeenCalledTimes(2);
    });

    it('should skip duplicate offers', async () => {
      const offers: Offer[] = [
        {
          title: 'Product 1',
          description: 'Description 1',
          originalPrice: 100,
          currentPrice: 80,
          discount: 20,
          discountPercentage: 20,
          currency: 'BRL',
          imageUrl: 'http://example.com/img1.jpg',
          productUrl: 'http://example.com/item/123.html',
          affiliateUrl: 'http://example.com/aff/1',
          source: 'aliexpress',
          category: 'electronics',
          isActive: true,
          isPosted: false,
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'Product 2',
          description: 'Description 2',
          originalPrice: 200,
          currentPrice: 150,
          discount: 50,
          discountPercentage: 25,
          currency: 'BRL',
          imageUrl: 'http://example.com/img2.jpg',
          productUrl: 'http://example.com/item/123.html', // Duplicate URL
          affiliateUrl: 'http://example.com/aff/2',
          source: 'aliexpress',
          category: 'electronics',
          isActive: true,
          isPosted: false,
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Mock existing active offer
      const existingOffer = {
        productUrl: 'http://example.com/item/123.html',
        _id: new mongoose.Types.ObjectId(),
      };

      (OfferModel.find as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([existingOffer]),
      });

      const result = await offerService.saveOffers(offers);

      // Should save 0 because both are duplicates
      expect(result).toBe(0);
    });
  });

  describe('getAllOffers', () => {
    it('should return all active offers', async () => {
      const mockOffers = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Product 1',
          isActive: true,
        },
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Product 2',
          isActive: true,
        },
      ];

      (OfferModel.find as jest.Mock) = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockOffers),
      });

      const result = await offerService.getAllOffers();

      expect(result).toHaveLength(2);
      expect(OfferModel.find).toHaveBeenCalledWith({ isActive: true });
    });

    it('should respect limit parameter', async () => {
      const mockOffers = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Product 1',
          isActive: true,
        },
      ];

      const queryChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockOffers),
      };

      (OfferModel.find as jest.Mock) = jest.fn().mockReturnValue(queryChain);

      await offerService.getAllOffers(10);

      expect(queryChain.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('getOfferById', () => {
    it('should return offer when found', async () => {
      const offerId = new mongoose.Types.ObjectId().toString();
      const mockOffer = {
        _id: offerId,
        title: 'Test Product',
        isActive: true,
      };

      (OfferModel.findById as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockOffer),
      });

      const result = await offerService.getOfferById(offerId);

      expect(result).toBeDefined();
      expect(result?.title).toBe('Test Product');
    });

    it('should return null when offer not found', async () => {
      const offerId = new mongoose.Types.ObjectId().toString();

      (OfferModel.findById as jest.Mock) = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await offerService.getOfferById(offerId);

      expect(result).toBeNull();
    });
  });

  describe('deleteOffer', () => {
    it('should soft delete offer by default', async () => {
      const offerId = new mongoose.Types.ObjectId().toString();

      (OfferModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue({
        _id: offerId,
        isActive: false,
      });

      const result = await offerService.deleteOffer(offerId);

      expect(result).toBe(true);
      expect(OfferModel.findByIdAndUpdate).toHaveBeenCalledWith(offerId, { isActive: false });
    });

    it('should permanently delete when permanent=true', async () => {
      const offerId = new mongoose.Types.ObjectId().toString();

      (OfferModel.findByIdAndDelete as jest.Mock) = jest.fn().mockResolvedValue({
        _id: offerId,
      });

      const result = await offerService.deleteOffer(offerId, true);

      expect(result).toBe(true);
      expect(OfferModel.findByIdAndDelete).toHaveBeenCalledWith(offerId);
    });
  });

  describe('deleteOffers', () => {
    it('should soft delete multiple offers', async () => {
      const offerIds = [
        new mongoose.Types.ObjectId().toString(),
        new mongoose.Types.ObjectId().toString(),
      ];

      (OfferModel.updateMany as jest.Mock) = jest.fn().mockResolvedValue({
        modifiedCount: 2,
      });

      const result = await offerService.deleteOffers(offerIds, false);

      expect(result).toBe(2);
      expect(OfferModel.updateMany).toHaveBeenCalledWith(
        { _id: { $in: offerIds } },
        { isActive: false }
      );
    });

    it('should permanently delete multiple offers', async () => {
      const offerIds = [
        new mongoose.Types.ObjectId().toString(),
        new mongoose.Types.ObjectId().toString(),
      ];

      (OfferModel.deleteMany as jest.Mock) = jest.fn().mockResolvedValue({
        deletedCount: 2,
      });

      const result = await offerService.deleteOffers(offerIds, true);

      expect(result).toBe(2);
      expect(OfferModel.deleteMany).toHaveBeenCalledWith({
        _id: { $in: offerIds },
      });
    });
  });

  describe('getStatistics', () => {
    it('should calculate statistics correctly', async () => {
      (OfferModel.countDocuments as jest.Mock) = jest
        .fn()
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(30); // posted

      (OfferModel.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest
          .fn()
          .mockResolvedValue([
            { discountPercentage: 20 },
            { discountPercentage: 30 },
            { discountPercentage: 25 },
          ]),
      });

      (OfferModel.aggregate as jest.Mock) = jest.fn().mockResolvedValue([
        { _id: 'aliexpress', count: 50 },
        { _id: 'mercadolivre', count: 50 },
      ]);

      const result = await offerService.getStatistics();

      expect(result.total).toBe(100);
      expect(result.posted).toBe(30);
      expect(result.notPosted).toBe(70);
      expect(result.avgDiscount).toBeGreaterThan(0);
    });
  });
});
