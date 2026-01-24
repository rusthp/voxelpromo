import { InstagramService } from '../InstagramService';
import { logger } from '../../../utils/logger';
import { OfferModel } from '../../../models/Offer';
import { PostHistoryModel } from '../../../models/PostHistory';
import { InstagramConversionModel } from '../../../models/InstagramConversion';

// Mocks
jest.mock('../../../utils/logger');
jest.mock('../../../models/Offer', () => ({
  OfferModel: {
    findById: jest.fn(),
  },
}));
jest.mock('../../../models/PostHistory', () => ({
  PostHistoryModel: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));
jest.mock('../../../models/InstagramConversion', () => ({
  InstagramConversionModel: {
    create: jest.fn(),
    exists: jest.fn(),
  },
}));

describe('Instagram Conversion System', () => {
  let service: InstagramService;
  let mockOfferModel: any;
  let mockPostHistoryModel: any;
  let mockConversionModel: any;

  beforeEach(() => {
    service = new InstagramService();
    // Setup mocks
    mockOfferModel = OfferModel;
    mockPostHistoryModel = PostHistoryModel;
    mockConversionModel = InstagramConversionModel;

    jest.clearAllMocks();

    // Mock private settings
    (service as any).igUserId = 'my-id';
    (service as any).accessToken = 'token';
    (service as any).settings = {
      enabled: true,
      autoReplyDM: true,
      keywordReplies: {},
    };

    // Mock sendDirectMessage
    (service as any).sendDirectMessage = jest.fn().mockResolvedValue(true);
    // Mock delay to be instant
    (service as any).delay = jest.fn().mockResolvedValue(true);
  });

  const mockOffer = {
    _id: 'offer-123',
    title: 'iPhone 13 128GB Apple',
    originalPrice: 5000,
    currentPrice: 3000,
    discountPercentage: 40,
    affiliateUrl: 'https://amzn.to/example',
    userId: 'user-1',
  };

  const mockPostHistory = {
    _id: 'ph-123',
    offerId: 'offer-123',
    metadata: {
      mediaId: 'story-123',
      affiliateUrl: 'https://amzn.to/cached',
    },
  };

  test('should BLOCK banned terms (Layer 2)', async () => {
    const payload = createMessagePayload('quero comprar maconha', 'story-123');

    await service.handleWebhook(payload);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Blocked message with banned term')
    );
    expect((service as any).sendDirectMessage).not.toHaveBeenCalled();
  });

  test('should IGNORE messages without purchase intent (Layer 3)', async () => {
    const payload = createMessagePayload('oi tudo bem com vc', 'story-123');

    await service.handleWebhook(payload);

    // Should not look up offer
    expect(mockPostHistoryModel.findOne).not.toHaveBeenCalled();
  });

  test('should SEND LINK for valid request (Happy Path)', async () => {
    // Setup data
    mockPostHistoryModel.findOne.mockResolvedValue(mockPostHistory);
    mockOfferModel.findById.mockReturnValue({ lean: () => mockOffer });
    mockConversionModel.exists.mockResolvedValue(false);

    const payload = createMessagePayload('eu quero comprar esse iphone', 'story-123');

    await service.handleWebhook(payload);

    // Verify flow
    expect(mockPostHistoryModel.findOne).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Affiliate link sent'));
    expect((service as any).sendDirectMessage).toHaveBeenCalledWith(
      'user-123',
      expect.stringContaining('https://amzn.to/cached')
    );
    expect(mockConversionModel.create).toHaveBeenCalled();
  });

  test('should SEND FALLBACK when context implies different product (Layer 4)', async () => {
    mockPostHistoryModel.findOne.mockResolvedValue(mockPostHistory); // Offer is iPhone
    mockOfferModel.findById.mockReturnValue({ lean: () => mockOffer });

    // User asks for something completely different
    const payload = createMessagePayload('quero comprar uma geladeira', 'story-123');

    await service.handleWebhook(payload);

    expect((service as any).sendDirectMessage).toHaveBeenCalledWith(
      'user-123',
      expect.stringContaining('Essa oferta é sobre')
    );
    // Should NOT send affiliate link
    expect((service as any).sendDirectMessage).not.toHaveBeenCalledWith(
      'user-123',
      expect.stringContaining('https://amzn.to/cached')
    );
  });

  test('should PREVENT DUPLICATES (Dedup)', async () => {
    mockPostHistoryModel.findOne.mockResolvedValue(mockPostHistory);
    mockOfferModel.findById.mockReturnValue({ lean: () => mockOffer });
    mockConversionModel.exists.mockResolvedValue(true); // Already sent

    const payload = createMessagePayload('quero', 'story-123');

    await service.handleWebhook(payload);

    expect((service as any).sendDirectMessage).toHaveBeenCalledWith(
      'user-123',
      expect.stringContaining('Você já recebeu o link')
    );
    // Conversion not recorded again
    expect(mockConversionModel.create).not.toHaveBeenCalled();
  });
});

function createMessagePayload(text: string, replyToStoryId?: string): any {
  return {
    object: 'instagram',
    entry: [
      {
        id: 'entry-1',
        time: 123456789,
        messaging: [
          {
            sender: { id: 'user-123' },
            recipient: { id: 'my-id' },
            timestamp: 123456789,
            message: {
              mid: 'msg-1',
              text: text,
              reply_to: replyToStoryId ? { story: { id: replyToStoryId } } : undefined,
            },
          },
        ],
      },
    ],
  };
}
