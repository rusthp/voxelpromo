import { Router, Request, Response } from 'express';
import { TemplateService } from '../services/automation/TemplateService';
import { OfferModel } from '../models/Offer';
import { logger } from '../utils/logger';

const router = Router();
const templateService = new TemplateService();

/**
 * @swagger
 * /api/templates:
 *   get:
 *     summary: Get all message templates
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *         description: Only return active templates
 *     responses:
 *       200:
 *         description: List of templates
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.activeOnly === 'true';
    const templates = await templateService.getAllTemplates(activeOnly);
    return res.json(templates);
  } catch (error: any) {
    logger.error('Error getting templates:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/templates/variables:
 *   get:
 *     summary: Get available template variables
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available variables
 */
router.get('/variables', async (_req: Request, res: Response) => {
  try {
    const variables = templateService.getAvailableVariables();
    return res.json(variables);
  } catch (error: any) {
    logger.error('Error getting variables:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/templates/init:
 *   post:
 *     summary: Initialize default templates
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Templates initialized
 */
router.post('/init', async (_req: Request, res: Response) => {
  try {
    await templateService.initializeDefaults();
    return res.json({ success: true, message: 'Default templates initialized' });
  } catch (error: any) {
    logger.error('Error initializing templates:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/templates/{id}:
 *   get:
 *     summary: Get template by ID
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template details
 *       404:
 *         description: Template not found
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const template = await templateService.getTemplate(req.params.id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    return res.json(template);
  } catch (error: any) {
    logger.error('Error getting template:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/templates:
 *   post:
 *     summary: Create new template
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - tone
 *               - content
 *     responses:
 *       201:
 *         description: Template created
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, tone, content, isActive, isDefault } = req.body;

    if (!name || !tone || !content) {
      return res.status(400).json({ error: 'Name, tone, and content are required' });
    }

    const template = await templateService.createTemplate({
      name,
      tone,
      content,
      isActive,
      isDefault,
    });

    return res.status(201).json({ success: true, template });
  } catch (error: any) {
    logger.error('Error creating template:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/templates/{id}:
 *   put:
 *     summary: Update template
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template updated
 *       404:
 *         description: Template not found
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const template = await templateService.updateTemplate(req.params.id, req.body);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    return res.json({ success: true, template });
  } catch (error: any) {
    logger.error('Error updating template:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/templates/{id}:
 *   delete:
 *     summary: Delete template
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template deleted
 *       404:
 *         description: Template not found
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const success = await templateService.deleteTemplate(req.params.id);

    if (!success) {
      return res.status(404).json({ error: 'Template not found' });
    }

    return res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting template:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/templates/{id}/test:
 *   post:
 *     summary: Test template with sample offer
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               offerId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Rendered template
 */
router.post('/:id/test', async (req: Request, res: Response) => {
  try {
    const template = await templateService.getTemplate(req.params.id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Get offer to test with
    let offer;
    if (req.body.offerId) {
      offer = await OfferModel.findById(req.body.offerId).lean();
    } else {
      // Get a random active offer
      const offers = await OfferModel.find({ isActive: true }).limit(1).lean();
      offer = offers[0];
    }

    if (!offer) {
      return res.status(404).json({ error: 'No offers available for testing' });
    }

    // Render template
    const rendered = templateService.renderTemplate(template, offer as any);

    return res.json({
      success: true,
      rendered,
      offer: {
        title: offer.title,
        price: offer.currentPrice,
        discount: offer.discountPercentage,
      },
    });
  } catch (error: any) {
    logger.error('Error testing template:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export const templatesRoutes = router;
