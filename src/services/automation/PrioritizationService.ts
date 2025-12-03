import { PeakHour } from '../../models/AutomationConfig';

export class PrioritizationService {
    /**
     * Calculate peak hour score (0-100)
     */
    getPeakHourScore(currentHour: number, peakHours: PeakHour[] = []): number {
        // Check if current hour is in any peak hour range
        for (const peak of peakHours) {
            if (this.isInPeakHour(currentHour, peak)) {
                // Return priority (1-10) mapped to 0-100
                return peak.priority * 10;
            }
        }

        // Not in peak hour
        return 0;
    }

    /**
     * Check if hour is within peak hour range
     */
    private isInPeakHour(hour: number, peak: PeakHour): boolean {
        if (peak.start <= peak.end) {
            // Normal range (e.g., 12-14)
            return hour >= peak.start && hour < peak.end;
        } else {
            // Overnight range (e.g., 22-2)
            return hour >= peak.start || hour < peak.end;
        }
    }

    /**
     * Calculate sales score (0-100) based on historical data
     */
    getSalesScore(productStats: any): number {
        if (!productStats) {
            return 0;
        }

        // Return the calculated sales score from ProductStats
        return productStats.salesScore || 0;
    }

    /**
     * Calculate discount score (0-100)
     */
    getDiscountScore(discountPercent: number, averageDiscount: number = 20): number {
        // Normalize based on average discount
        // Products with 2x average discount get ~100 score
        const score = (discountPercent / (averageDiscount * 2)) * 100;
        return Math.min(100, Math.max(0, score));
    }

    /**
     * Calculate final priority score combining all factors
     */
    calculateFinalScore(
        scores: {
            peakScore: number;
            salesScore: number;
            discountScore: number;
        },
        context: {
            isPeakHour: boolean;
            prioritizeBestSellersInPeak: boolean;
            prioritizeBigDiscountsInPeak: boolean;
            discountWeightVsSales: number; // 0-100
        }
    ): number {
        const { peakScore, salesScore, discountScore } = scores;
        const {
            isPeakHour,
            prioritizeBestSellersInPeak,
            prioritizeBigDiscountsInPeak,
            discountWeightVsSales,
        } = context;

        // Base weights (when not in peak hour)
        let salesWeight = (100 - discountWeightVsSales) / 100; // 0-1
        let discountWeight = discountWeightVsSales / 100; // 0-1
        let peakWeight = 0.1; // Small weight for peak hour bonus

        // Adjust weights during peak hours
        if (isPeakHour) {
            peakWeight = 0.3; // Increase peak hour weight

            if (prioritizeBestSellersInPeak) {
                // Increase sales weight during peak
                salesWeight = salesWeight * 1.5;
            }

            if (prioritizeBigDiscountsInPeak) {
                // Increase discount weight during peak
                discountWeight = discountWeight * 1.5;
            }
        }

        // Normalize weights to sum to 1
        const totalWeight = salesWeight + discountWeight + peakWeight;
        salesWeight = salesWeight / totalWeight;
        discountWeight = discountWeight / totalWeight;
        peakWeight = peakWeight / totalWeight;

        // Calculate weighted score
        const finalScore =
            salesScore * salesWeight + discountScore * discountWeight + peakScore * peakWeight;

        return Math.min(100, Math.max(0, finalScore));
    }

    /**
     * Get recommended posting time based on product stats
     */
    getRecommendedPostingTime(productStats: any): number | null {
        if (!productStats || !productStats.hourlyStats || productStats.hourlyStats.length === 0) {
            return null;
        }

        // Find hour with best conversion rate
        let bestHour = 0;
        let bestRate = 0;

        for (const hourStat of productStats.hourlyStats) {
            const conversionRate =
                hourStat.views > 0 ? hourStat.conversions / hourStat.views : 0;

            if (conversionRate > bestRate) {
                bestRate = conversionRate;
                bestHour = hourStat.hour;
            }
        }

        return bestRate > 0 ? bestHour : null;
    }
}
