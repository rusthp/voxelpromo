import { Router } from 'express';
import Joi from 'joi';
import { OfferService } from '../services/offer/OfferService';
import { validateRequest } from '../middleware/validation';
import { FilterOptions } from '../types';

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
    } = req.query;

    if (
      minDiscount ||
      maxPrice ||
      minPrice ||
      minRating ||
      categories ||
      sources ||
      excludePosted
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
      };

      const offers = await offerService.filterOffers(filterOptions);
      res.json(offers);
    } else {
      // Get all offers with default limit of 50 (use limit query param to override)
      const requestedLimit = limit ? parseInt(limit as string) : 50;
      const offers = await offerService.getAllOffers(
        requestedLimit,
        skip ? parseInt(skip as string) : 0
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
    console.error('[DELETE BATCH] Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export { router as offerRoutes };
