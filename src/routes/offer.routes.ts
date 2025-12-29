import { Router } from 'express';
import Joi from 'joi';
import { OfferService } from '../services/offer/OfferService';
import { validateRequest } from '../middleware/validation';
import { FilterOptions, Offer } from '../types';
import { PrioritizationService, SEASONAL_EVENTS } from '../services/automation/PrioritizationService';

const router = Router();

// Validation schemas for offer routes
const deleteOffersSchema = Joi.object({
  offerIds: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .min(1)
    .required()
    .messages({
      'array.min': 'Pelo menos um ID de oferta deve ser fornecido',
      'any.required': 'IDs de ofertas são obrigatórios',
      'string.pattern.base': 'IDs de ofertas inválidos',
    }),
  permanent: Joi.boolean().optional(),
});

const offerService = new OfferService();

/**
 * @swagger
 * tags:
 *   - name: Offers
 *     description: Offer management and collection
 */

/**
 * @swagger
 * /api/offers:
 *   get:
 *     summary: Get all offers with optional filtering and pagination
 *     tags: [Offers]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of offers to return
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of offers to skip
 *       - in: query
 *         name: minDiscount
 *         schema:
 *           type: number
 *         description: Minimum discount percentage
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price
 *       - in: query
 *         name: sources
 *         schema:
 *           type: string
 *         description: Comma-separated list of sources
 *     responses:
 *       200:
 *         description: List of offers
 *         content:
 *           application/json:\n *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Offer'
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const {
      minDiscount,
      maxPrice,
      minPrice,
      minRating,
      categories,
      sources,
      excludePosted,
      limit,
      skip,
      sortBy,
      search, // NEW: search parameter for title search
    } = req.query;

    if (
      minDiscount ||
      maxPrice ||
      minPrice ||
      minRating ||
      categories ||
      sources ||
      excludePosted ||
      sortBy ||
      search // Include search in filter check
    ) {
      // Use filter service
      const filterOptions: FilterOptions = {
        minDiscount: minDiscount ? parseFloat(minDiscount as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        minRating: minRating ? parseFloat(minRating as string) : undefined,
        categories: categories ? (categories as string).split(',') : undefined,
        sources: sources ? (sources as string).split(',') : undefined,
        excludePosted: excludePosted === 'true',
        limit: limit ? parseInt(limit as string) : undefined,
        skip: skip ? parseInt(skip as string) : 0,
        sortBy: sortBy as string,
        search: search as string, // NEW: pass search to filter
      };

      const offers = await offerService.filterOffers(filterOptions);
      res.json(offers);
    } else {
      // Get all offers with default limit of 50 (use limit query param to override)
      const requestedLimit = limit ? parseInt(limit as string) : 50;
      const offers = await offerService.getAllOffers(
        requestedLimit,
        skip ? parseInt(skip as string) : 0,
        sortBy as string
      );
      // Log for debugging
      console.log(
        `[API] GET /offers - Limit: ${requestedLimit}, Skip: ${skip || 0}, Returned: ${offers.length} offers`
      );
      res.json(offers);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/offers
 * Create a new offer manually
 */
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      original_price,
      originalPrice,
      discount_percentage,
      link,
      image,
      source,
      category,
    } = req.body;

    if (!title || !price || !link) {
      return res.status(400).json({
        error: 'Title, price, and link are required',
      });
    }

    const currentPrice = parseFloat(price);
    const origPrice = original_price ? parseFloat(original_price) : (originalPrice ? parseFloat(originalPrice) : currentPrice);
    const discountPct = discount_percentage ||
      (origPrice > currentPrice
        ? Math.round((1 - currentPrice / origPrice) * 100)
        : 0);

    const offer: Partial<Offer> = {
      title,
      description: description || '',
      originalPrice: origPrice,
      currentPrice: currentPrice,
      discount: origPrice - currentPrice,
      discountPercentage: discountPct,
      currency: 'BRL',
      imageUrl: image || '',
      productUrl: link,
      affiliateUrl: link,
      source: source || 'manual',
      category: category || 'Outros',
      tags: [],
      isActive: true,
      isPosted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const savedOffer = await offerService.saveOffer(offer as Offer);

    return res.status(201).json({
      success: true,
      offer: savedOffer,
      message: 'Offer created successfully',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/offers/:id
 * Get offer by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const offer = await offerService.getOfferById(req.params.id);
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }
    return res.json(offer);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/offers
 * Create new offer
 */
router.post('/', async (req, res) => {
  try {
    const offer = await offerService.saveOffer(req.body);
    res.status(201).json(offer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/offers/:id/generate-post
 * Generate AI post for offer
 */
router.post('/:id/generate-post', async (req, res) => {
  try {
    const { tone } = req.body;
    const post = await offerService.generateAIPost(req.params.id, tone);
    res.json({ post });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/offers/:id/post
 * Post offer to channels
 */
router.post('/:id/post', async (req, res) => {
  try {
    const { channels } = req.body;
    const success = await offerService.postOffer(req.params.id, channels || ['telegram']);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/offers/:id/schedule
 * Schedule offer for posting
 */
router.post('/:id/schedule', async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const scheduledDate = new Date(date);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    if (scheduledDate <= new Date()) {
      return res.status(400).json({ error: 'Schedule date must be in the future' });
    }

    const success = await offerService.scheduleOffer(req.params.id, scheduledDate);
    if (!success) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    return res.json({ success: true, scheduledAt: scheduledDate });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/offers/all
 * Delete ALL offers
 * Query: ?permanent=true (optional)
 */
router.delete('/all', async (req, res) => {
  try {
    const permanent = req.query.permanent === 'true';
    const deletedCount = await offerService.deleteAllOffers(permanent);

    return res.json({
      success: true,
      deletedCount,
      message: permanent
        ? `Permanently deleted ${deletedCount} offers`
        : `Soft deleted ${deletedCount} offers`
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/offers/:id
 * Delete offer (soft delete by default, use ?permanent=true for permanent deletion)
 */
router.delete('/:id', async (req, res) => {
  try {
    const permanent = req.query.permanent === 'true';
    const success = await offerService.deleteOffer(req.params.id, permanent);
    if (!success) {
      return res.status(404).json({ error: 'Offer not found' });
    }
    return res.json({
      success: true,
      message: permanent ? 'Offer permanently deleted' : 'Offer deleted',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/offers
 * Delete multiple offers
 * Body: { offerIds: string[], permanent?: boolean }
 */
router.delete('/', validateRequest(deleteOffersSchema), async (req, res) => {
  try {
    const { offerIds, permanent } = req.body;

    console.log('[DELETE BATCH] Received request:', {
      offerIdsCount: offerIds?.length,
      permanent,
      firstIds: offerIds?.slice(0, 3),
    });

    const deletedCount = await offerService.deleteOffers(offerIds, permanent === true);

    console.log('[DELETE BATCH] Success:', { deletedCount });

    return res.json({ success: true, deletedCount, message: `Deleted ${deletedCount} offers` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================
// SEASONAL OFFERS ENDPOINTS
// ============================================================

const prioritizationService = new PrioritizationService();

/**
 * GET /api/offers/seasonal/events
 * Get currently active seasonal events
 */
router.get('/seasonal/events', async (_req, res) => {
  try {
    const activeEvents = prioritizationService.getActiveSeasonalEvents();
    const allEvents = SEASONAL_EVENTS.map(event => ({
      ...event,
      isActive: prioritizationService.isEventActiveOnDate(event)
    }));

    return res.json({
      success: true,
      activeEvents,
      allEvents,
      activeKeywords: prioritizationService.getActiveSeasonalKeywords()
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/offers/seasonal
 * Get offers matching active seasonal events
 */
router.get('/seasonal', async (req, res) => {
  try {
    const { limit = '50', skip = '0' } = req.query;

    // Get all offers
    const allOffers = await offerService.getAllOffers(
      parseInt(limit as string) * 2, // Get more to filter
      parseInt(skip as string)
    );

    // Filter offers that match active seasonal events
    const seasonalOffers = allOffers
      .map(offer => {
        const match = prioritizationService.matchesActiveSeasonalEvent(offer);
        return {
          ...offer,
          seasonalMatch: match.matches ? match : null,
          seasonalScore: prioritizationService.getSeasonalScore(offer)
        };
      })
      .filter(offer => offer.seasonalMatch !== null)
      .sort((a, b) => b.seasonalScore - a.seasonalScore)
      .slice(0, parseInt(limit as string));

    const activeEvents = prioritizationService.getActiveSeasonalEvents();

    return res.json({
      success: true,
      activeEvents: activeEvents.map(e => e.name),
      totalMatched: seasonalOffers.length,
      offers: seasonalOffers
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/offers/seasonal/check
 * Check if specific offers match seasonal events
 */
router.post('/seasonal/check', async (req, res) => {
  try {
    const { offerIds } = req.body;

    if (!offerIds || !Array.isArray(offerIds)) {
      return res.status(400).json({ error: 'offerIds array is required' });
    }

    const results: { offerId: string; matches: boolean; matchedEvents: string[]; matchedKeywords: string[]; score: number }[] = [];

    for (const offerId of offerIds) {
      const offer = await offerService.getOfferById(offerId);
      if (offer) {
        const match = prioritizationService.matchesActiveSeasonalEvent(offer);
        results.push({
          offerId,
          matches: match.matches,
          matchedEvents: match.matchedEvents,
          matchedKeywords: match.matchedKeywords,
          score: prioritizationService.getSeasonalScore(offer)
        });
      }
    }

    return res.json({
      success: true,
      results,
      activeEvents: prioritizationService.getActiveSeasonalEvents().map(e => e.name)
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});



export { router as offerRoutes };
