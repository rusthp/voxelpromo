import { Router } from 'express';
import { OfferService } from '../services/offer/OfferService';
import { FilterOptions } from '../types';

const router = Router();
const offerService = new OfferService();

/**
 * GET /api/offers
 * Get all offers with optional filters
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
      skip
    } = req.query;

    if (minDiscount || maxPrice || minPrice || minRating || categories || sources || excludePosted) {
      // Use filter service
      const filterOptions: FilterOptions = {
        minDiscount: minDiscount ? parseFloat(minDiscount as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        minRating: minRating ? parseFloat(minRating as string) : undefined,
        categories: categories ? (categories as string).split(',') : undefined,
        sources: sources ? (sources as string).split(',') : undefined,
        excludePosted: excludePosted === 'true',
        limit: limit ? parseInt(limit as string) : undefined
      };

      const offers = await offerService.filterOffers(filterOptions);
      res.json(offers);
    } else {
      // Get all offers (no limit by default, or use limit if provided)
      const requestedLimit = limit ? parseInt(limit as string) : undefined;
      const offers = await offerService.getAllOffers(
        requestedLimit, // No limit by default
        skip ? parseInt(skip as string) : 0
      );
      // Log for debugging
      console.log(`[API] GET /offers - Limit: ${requestedLimit || 'none'}, Returned: ${offers.length} offers`);
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
    return res.json({ success: true, message: permanent ? 'Offer permanently deleted' : 'Offer deleted' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/offers
 * Delete multiple offers
 * Body: { ids: string[], permanent?: boolean }
 */
router.delete('/', async (req, res) => {
  try {
    const { ids, permanent } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    const deletedCount = await offerService.deleteOffers(ids, permanent === true);
    return res.json({ success: true, deletedCount, message: `Deleted ${deletedCount} offers` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export { router as offerRoutes };

