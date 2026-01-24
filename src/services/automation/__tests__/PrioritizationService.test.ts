import { PrioritizationService } from '../PrioritizationService';

describe('PrioritizationService - High Ticket Strategy', () => {
  let service: PrioritizationService;

  beforeEach(() => {
    service = new PrioritizationService();
  });

  it('should calculate revenue score correctly', () => {
    // Formula: (Discount% * 10) + (Price * 100)
    // Item: Price 1000, Discount 10%
    // Score: 100 + 100,000 = 100,100
    const score = service.getRevenueScore(10, 1000);
    expect(score).toBe(100100);
  });

  it('should prioritize high ticket item over high discount low ticket item when mode is enabled', () => {
    const highTicketItem = {
      price: 1000,
      discount: 15, // Above 10% threshold
    };

    const lowTicketItem = {
      price: 150, // Above 100 threshold
      discount: 90,
    };

    const scoreHigh = service.calculateFinalScore(
      {
        peakScore: 0,
        salesScore: 50,
        discountScore: 50,
        revenueScore: service.getRevenueScore(highTicketItem.discount, highTicketItem.price),
      },
      {
        isPeakHour: false,
        prioritizeBestSellersInPeak: false,
        prioritizeBigDiscountsInPeak: false,
        discountWeightVsSales: 50,
        prioritizeHighTicket: true,
        minPriceForHighTicket: 100,
        minDiscountForHighTicket: 10,
        currentPrice: highTicketItem.price,
        discountPercent: highTicketItem.discount,
      }
    );

    const scoreLow = service.calculateFinalScore(
      {
        peakScore: 0,
        salesScore: 50,
        discountScore: 50,
        revenueScore: service.getRevenueScore(lowTicketItem.discount, lowTicketItem.price),
      },
      {
        isPeakHour: false,
        prioritizeBestSellersInPeak: false,
        prioritizeBigDiscountsInPeak: false,
        discountWeightVsSales: 50,
        prioritizeHighTicket: true,
        minPriceForHighTicket: 100,
        minDiscountForHighTicket: 10,
        currentPrice: lowTicketItem.price,
        discountPercent: lowTicketItem.discount,
      }
    );

    // High Ticket (1000*100 + 15*10 = 100,150 + bonuses) should beat Low Ticket (150*100 + 90*10 = 15,900 + bonuses)
    expect(scoreHigh).toBeGreaterThan(scoreLow);
  });

  it('should penalize items above high ticket threshold', () => {
    const expensiveItem = {
      price: 6000, // Above 5000 threshold
      discount: 10,
    };

    const score = service.calculateFinalScore(
      {
        peakScore: 0,
        salesScore: 50,
        discountScore: 50,
        revenueScore: service.getRevenueScore(expensiveItem.discount, expensiveItem.price),
      },
      {
        isPeakHour: false,
        prioritizeBestSellersInPeak: false,
        prioritizeBigDiscountsInPeak: false,
        discountWeightVsSales: 50,
        prioritizeHighTicket: true,
        highTicketThreshold: 5000,
        currentPrice: expensiveItem.price,
      }
    );

    expect(score).toBe(0);
  });

  it('should use standard scoring when high ticket mode is disabled', () => {
    // Standard mode clamps between 0-100
    const score = service.calculateFinalScore(
      {
        peakScore: 0,
        salesScore: 100,
        discountScore: 100,
        revenueScore: 999999,
      },
      {
        isPeakHour: false,
        prioritizeBestSellersInPeak: false,
        prioritizeBigDiscountsInPeak: false,
        discountWeightVsSales: 50,
        prioritizeHighTicket: false, // Disabled
      }
    );

    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThan(0);
  });

  it('should use standard scoring when price is below minPriceForHighTicket', () => {
    const cheapItem = {
      price: 50, // Below 100 threshold
      discount: 90,
    };

    const score = service.calculateFinalScore(
      {
        peakScore: 0,
        salesScore: 50,
        discountScore: 90,
        revenueScore: service.getRevenueScore(cheapItem.discount, cheapItem.price),
      },
      {
        isPeakHour: false,
        prioritizeBestSellersInPeak: false,
        prioritizeBigDiscountsInPeak: false,
        discountWeightVsSales: 50,
        prioritizeHighTicket: true,
        minPriceForHighTicket: 100,
        currentPrice: cheapItem.price,
        discountPercent: cheapItem.discount,
      }
    );

    // Should use standard scoring (clamped 0-100)
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should use standard scoring when discount is below minDiscountForHighTicket', () => {
    const lowDiscountHighPrice = {
      price: 500, // High enough
      discount: 5, // Below 10% threshold
    };

    const score = service.calculateFinalScore(
      {
        peakScore: 0,
        salesScore: 50,
        discountScore: 5,
        revenueScore: service.getRevenueScore(
          lowDiscountHighPrice.discount,
          lowDiscountHighPrice.price
        ),
      },
      {
        isPeakHour: false,
        prioritizeBestSellersInPeak: false,
        prioritizeBigDiscountsInPeak: false,
        discountWeightVsSales: 50,
        prioritizeHighTicket: true,
        minPriceForHighTicket: 100,
        minDiscountForHighTicket: 10,
        currentPrice: lowDiscountHighPrice.price,
        discountPercent: lowDiscountHighPrice.discount,
      }
    );

    // Should use standard scoring (clamped 0-100)
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should apply high ticket formula when price AND discount meet thresholds', () => {
    const qualifiedItem = {
      price: 500,
      discount: 15,
    };

    const score = service.calculateFinalScore(
      {
        peakScore: 0,
        salesScore: 50,
        discountScore: 15,
        revenueScore: service.getRevenueScore(qualifiedItem.discount, qualifiedItem.price),
      },
      {
        isPeakHour: false,
        prioritizeBestSellersInPeak: false,
        prioritizeBigDiscountsInPeak: false,
        discountWeightVsSales: 50,
        prioritizeHighTicket: true,
        minPriceForHighTicket: 100,
        minDiscountForHighTicket: 10,
        currentPrice: qualifiedItem.price,
        discountPercent: qualifiedItem.discount,
      }
    );

    // Should use High Ticket formula: (15*10) + (500*100) = 50150 + bonuses
    expect(score).toBeGreaterThan(100);
  });
});
