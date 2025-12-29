import { PeakHour } from '../../models/AutomationConfig';

export interface SeasonalEvent {
    name: string;
    startMonth: number; // 0-11 (Jan=0, Dec=11)
    startDay: number;
    endMonth: number;
    endDay: number;
    keywords: string[];
}

export const SEASONAL_EVENTS: SeasonalEvent[] = [
    // === DEZEMBRO ===
    {
        name: 'Natal',
        startMonth: 11, // Dezembro
        startDay: 1,
        endMonth: 11,
        endDay: 25,
        keywords: ['natal', 'christmas', 'presente', 'papai noel', 'arvore', 'enfeite', 'brinquedo', 'lego', 'boneca', 'jogo', 'perfume', 'chocolate', 'panetone'],
    },
    {
        name: 'Ano Novo',
        startMonth: 11, // Dezembro
        startDay: 26,
        endMonth: 0, // Janeiro
        endDay: 2,
        keywords: ['ano novo', 'reveillon', 'champagne', 'espumante', 'roupa branca', 'lingerie', 'decoração', 'festa', 'viagem'],
    },
    // === NOVEMBRO ===
    {
        name: 'Black Friday',
        startMonth: 10, // Novembro
        startDay: 1,
        endMonth: 10,
        endDay: 30,
        keywords: ['black friday', 'black', 'friday', 'oferta', 'desconto', 'tech', 'iphone', 'samsung', 'tv', 'smart', 'celular', 'notebook', 'pc', 'gamer'],
    },
    {
        name: 'Cyber Monday',
        startMonth: 11, // Dezembro (primeira semana)
        startDay: 1,
        endMonth: 11,
        endDay: 5,
        keywords: ['cyber monday', 'cyber', 'tech', 'eletrônico', 'software', 'streaming', 'assinatura', 'game', 'console'],
    },
    // === OUTUBRO ===
    {
        name: 'Dia das Crianças',
        startMonth: 9, // Outubro
        startDay: 1,
        endMonth: 9,
        endDay: 12,
        keywords: ['criança', 'brinquedo', 'jogo', 'infantil', 'boneca', 'carrinho', 'lego', 'nerf', 'patinete', 'bicicleta'],
    },
    // === AGOSTO ===
    {
        name: 'Dia dos Pais',
        startMonth: 7, // Agosto
        startDay: 1,
        endMonth: 7,
        endDay: 15,
        keywords: ['pai', 'homem', 'ferramenta', 'bebida', 'churrasco', 'relógio', 'carteira', 'perfume'],
    },
    // === JUNHO ===
    {
        name: 'Dia dos Namorados',
        startMonth: 5, // Junho
        startDay: 1,
        endMonth: 5,
        endDay: 12,
        keywords: ['namorado', 'namorada', 'amor', 'casal', 'perfume', 'chocolate', 'aliança', 'presente', 'sexy', 'lingerie'],
    },
    {
        name: 'Festa Junina',
        startMonth: 5, // Junho
        startDay: 10,
        endMonth: 6, // Julho
        endDay: 15,
        keywords: ['festa junina', 'são joão', 'quadrilha', 'fogueira', 'pipoca', 'milho', 'paçoca', 'quentão', 'chapéu de palha'],
    },
    // === MAIO ===
    {
        name: 'Dia das Mães',
        startMonth: 4, // Maio
        startDay: 1,
        endMonth: 4,
        endDay: 15,
        keywords: ['mãe', 'mae', 'mulher', 'perfume', 'bolsa', 'beleza', 'maquiagem', 'cozinha', 'casa', 'flor'],
    },
    // === MARÇO/ABRIL ===
    {
        name: 'Páscoa',
        startMonth: 2, // Março
        startDay: 15,
        endMonth: 3, // Abril
        endDay: 30,
        keywords: ['pascoa', 'páscoa', 'chocolate', 'ovo', 'bombom', 'coelho'],
    },
    {
        name: 'Dia do Consumidor',
        startMonth: 2, // Março
        startDay: 10,
        endMonth: 2,
        endDay: 20,
        keywords: ['consumidor', 'desconto', 'promoção', 'tech', 'eletrônico', 'celular', 'tv', 'notebook'],
    },
    // === FEVEREIRO/MARÇO ===
    {
        name: 'Carnaval',
        startMonth: 1, // Fevereiro (pode variar)
        startDay: 1,
        endMonth: 2, // Março
        endDay: 10,
        keywords: ['carnaval', 'fantasia', 'glitter', 'maquiagem', 'abadá', 'cerveja', 'caixa de som', 'bluetooth', 'cooler', 'bloco'],
    },
    // === JANEIRO/FEVEREIRO ===
    {
        name: 'Volta às Aulas',
        startMonth: 0, // Janeiro
        startDay: 10,
        endMonth: 1, // Fevereiro
        endDay: 28,
        keywords: ['escola', 'aula', 'mochila', 'caderno', 'lápis', 'caneta', 'estojo', 'uniforme', 'livro', 'material escolar'],
    },
];

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
     * Calculate revenue score based on user formula: (Discount% * 10) + (Price * 100)
     * This favors high ticket items significantly.
     */
    getRevenueScore(discountPercent: number, currentPrice: number): number {
        // Formula: (Discount% * 10) + (Price * 100)
        return (discountPercent * 10) + (currentPrice * 100);
    }

    /**
     * Calculate final priority score combining all factors
     */
    calculateFinalScore(
        scores: {
            peakScore: number;
            salesScore: number;
            discountScore: number;
            priceScore?: number; // 0-100 (100 = cheap, 0 = expensive)
            seasonalScore?: number; // 0-100 (100 = highly seasonal match)
            revenueScore?: number; // Custom formula for High Ticket
        },
        context: {
            isPeakHour: boolean;
            prioritizeBestSellersInPeak: boolean;
            prioritizeBigDiscountsInPeak: boolean;
            discountWeightVsSales: number; // 0-100
            prioritizeHighTicket?: boolean;
            highTicketThreshold?: number;
            minPriceForHighTicket?: number;
            minDiscountForHighTicket?: number;
            currentPrice?: number;
            discountPercent?: number;
        }
    ): number {
        const { peakScore, salesScore, discountScore, priceScore = 0, seasonalScore = 0, revenueScore = 0 } = scores;
        const {
            isPeakHour,
            prioritizeBestSellersInPeak,
            prioritizeBigDiscountsInPeak,
            discountWeightVsSales,
            prioritizeHighTicket = false,
            highTicketThreshold = 5000,
            currentPrice = 0
        } = context;

        // == HIGH TICKET STRATEGY ==
        if (prioritizeHighTicket) {
            // Get additional thresholds from context
            const minPriceForHighTicket = context.minPriceForHighTicket ?? 100;
            const minDiscountForHighTicket = context.minDiscountForHighTicket ?? 10;
            const discountPercent = context.discountPercent ?? 0;

            // 1. If price is above threshold (e.g., 5k), filter out (possible pricing error)
            if (currentPrice > highTicketThreshold) {
                return 0;
            }

            // 2. If price is below minimum (e.g., < 100), use standard scoring (not "high ticket")
            if (currentPrice < minPriceForHighTicket) {
                // Fall through to standard scoring below
            }
            // 3. If price is in high ticket range but discount is too low, use standard scoring
            else if (discountPercent < minDiscountForHighTicket) {
                // Fall through to standard scoring below
            }
            // 4. Price is high enough AND discount is good enough → Apply High Ticket formula
            else {
                // Revenue-focused score: favors high price items with decent discount
                return revenueScore + (salesScore * 0.1) + (seasonalScore * 10);
            }
        }

        // == STANDARD STRATEGY ==

        // Base weights
        let salesWeight = (100 - discountWeightVsSales) / 100; // 0-1
        let discountWeight = discountWeightVsSales / 100; // 0-1
        let peakWeight = 0.1;
        let priceWeight = 0.1; // New weight for price
        let seasonalWeight = 0.05; // Base weight for seasons

        // STRATEGY: Smart "Robin Hood" Prioritization

        if (isPeakHour) {
            // == PEAK HOUR STRATEGY (PRIME TIME) ==
            // Goal: Maximize revenue/conversions immediately.
            // Show the absolute BEST offers (high sales, big discounts).

            peakWeight = 0.4; // Massive boost for being in peak hour

            if (prioritizeBestSellersInPeak) {
                salesWeight *= 2.0; // Double importance of sales history
            }

            if (prioritizeBigDiscountsInPeak) {
                discountWeight *= 1.5; // Boost high discounts
            }

            // Reduce price importance in peak (people buy expensive stuff in prime time too)
            priceWeight = 0.05;

            // SEASONAL BOOST IN PEAK
            if (seasonalScore > 50) {
                // If it's a seasonal item in peak time, IT IS KING.
                seasonalWeight = 0.5; // Huge weight
                // Reduce others slightly
                peakWeight = 0.3;
            }
        } else {
            // == OFF-PEAK STRATEGY (VALLEY) ==
            // Goal: "Clean stock" and preserve best offers for Prime Time.
            // Prioritize: Low ticket items, new items, ok discounts.
            // Penalize: Top Tier items (don't waste them now).

            // 1. Preservation Penalty: If it's a "Top Tier" offer, reduce its score
            // Top Tier = High Sales Score OR High Discount
            if (salesScore > 70 || discountScore > 70) {
                // Artificial penalty to save it for later
                // We return a lower score so it appears less likely in the shuffle
                return (salesScore * salesWeight + discountScore * discountWeight) * 0.4;
            }

            // 2. Low Ticket Boost: Cheap items get priority now
            priceWeight = 0.4; // High importance on low price

            // Adjust other weights down to accommodate price weight
            salesWeight *= 0.5;
            discountWeight *= 0.5;
        }

        // Normalize weights to sum to ~1 (approximate is fine for scoring)
        const totalWeight = salesWeight + discountWeight + peakWeight + priceWeight + seasonalWeight;

        // Calculate weighted score
        const finalScore =
            (salesScore * salesWeight +
                discountScore * discountWeight +
                peakScore * peakWeight +
                priceScore * priceWeight +
                seasonalScore * seasonalWeight) / totalWeight;

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

    /**
     * Calculate seasonal score (0-100)
     * Checks if current date matches any event and if offer contains keywords
     */
    getSeasonalScore(offer: { title: string; category?: string; description?: string }): number {
        const now = new Date();
        const month = now.getMonth(); // 0-11
        const day = now.getDate();

        // 1. Check active events
        const activeEvents = SEASONAL_EVENTS.filter(event => {
            if (event.startMonth === event.endMonth) {
                return month === event.startMonth && day >= event.startDay && day <= event.endDay;
            } else {
                // Cross-month logic (simple version)
                if (month === event.startMonth) return day >= event.startDay;
                if (month === event.endMonth) return day <= event.endDay;
                return month > event.startMonth && month < event.endMonth;
            }
        });

        if (activeEvents.length === 0) {
            return 0; // No seasonal event active
        }

        // 2. Check keywords match
        const text = `${offer.title} ${offer.category || ''} ${offer.description || ''}`.toLowerCase();



        for (const event of activeEvents) {
            // Check if ANY keyword matches
            const hasMatch = event.keywords.some(keyword => text.includes(keyword.toLowerCase()));

            if (hasMatch) {
                // Found a match!
                // Score depends on strictness? For now, flat high score.
                return 100;
            }
        }

        return 0;
    }

    /**
     * Check if a specific event is active on a given date
     */
    isEventActiveOnDate(event: SeasonalEvent, date: Date = new Date()): boolean {
        const month = date.getMonth();
        const day = date.getDate();

        // Handle cross-year events (e.g., Ano Novo: Dec 26 - Jan 2)
        if (event.startMonth > event.endMonth) {
            // Event crosses year boundary
            if (month === event.startMonth) return day >= event.startDay;
            if (month === event.endMonth) return day <= event.endDay;
            return false;
        }

        // Same month event
        if (event.startMonth === event.endMonth) {
            return month === event.startMonth && day >= event.startDay && day <= event.endDay;
        }

        // Cross-month event (within same year)
        if (month === event.startMonth) return day >= event.startDay;
        if (month === event.endMonth) return day <= event.endDay;
        return month > event.startMonth && month < event.endMonth;
    }

    /**
     * Get all currently active seasonal events
     */
    getActiveSeasonalEvents(date: Date = new Date()): SeasonalEvent[] {
        return SEASONAL_EVENTS.filter(event => this.isEventActiveOnDate(event, date));
    }

    /**
     * Get all keywords for currently active events
     */
    getActiveSeasonalKeywords(date: Date = new Date()): string[] {
        const activeEvents = this.getActiveSeasonalEvents(date);
        const keywords = new Set<string>();

        for (const event of activeEvents) {
            for (const keyword of event.keywords) {
                keywords.add(keyword.toLowerCase());
            }
        }

        return Array.from(keywords);
    }

    /**
     * Check if an offer matches any active seasonal event
     */
    matchesActiveSeasonalEvent(
        offer: { title: string; category?: string; description?: string },
        date: Date = new Date()
    ): { matches: boolean; matchedEvents: string[]; matchedKeywords: string[] } {
        const activeEvents = this.getActiveSeasonalEvents(date);
        const text = `${offer.title} ${offer.category || ''} ${offer.description || ''}`.toLowerCase();

        const matchedEvents: string[] = [];
        const matchedKeywords: string[] = [];

        for (const event of activeEvents) {
            for (const keyword of event.keywords) {
                if (text.includes(keyword.toLowerCase())) {
                    if (!matchedEvents.includes(event.name)) {
                        matchedEvents.push(event.name);
                    }
                    if (!matchedKeywords.includes(keyword)) {
                        matchedKeywords.push(keyword);
                    }
                }
            }
        }

        return {
            matches: matchedEvents.length > 0,
            matchedEvents,
            matchedKeywords
        };
    }
}
