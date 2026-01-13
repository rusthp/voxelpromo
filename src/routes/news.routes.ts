import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import NewsService from '../services/NewsService';
import { logger } from '../utils/logger';

const router = Router();

// Public route: List published news
router.get('/', async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const type = req.query.type as string;

        const result = await NewsService.list({
            publishedOnly: true,
            limit,
            page,
            type
        });

        res.json({
            success: true,
            data: result.data,
            pagination: {
                page,
                limit,
                total: result.total,
                pages: result.pages
            }
        });
    } catch (error) {
        logger.error('Error fetching news:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Admin routes: Require authentication and admin privileges
router.post('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
        const newItem = await NewsService.create(req.body);
        res.status(201).json({ success: true, data: newItem });
    } catch (error) {
        logger.error('Error creating news:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.put('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
        const updatedItem = await NewsService.update(req.params.id, req.body);
        if (!updatedItem) {
            return res.status(404).json({ success: false, error: 'News item not found' });
        }
        return res.json({ success: true, data: updatedItem });
    } catch (error) {
        logger.error('Error updating news:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
        const deletedItem = await NewsService.delete(req.params.id);
        if (!deletedItem) {
            return res.status(404).json({ success: false, error: 'News item not found' });
        }
        return res.json({ success: true, message: 'News item deleted successfully' });
    } catch (error) {
        logger.error('Error deleting news:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Admin route to list ALL news (including unpublished)
router.get('/admin/all', authenticate, requireAdmin, async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const type = req.query.type as string;

        const result = await NewsService.list({
            publishedOnly: false,
            limit,
            page,
            type
        });

        res.json({
            success: true,
            data: result.data,
            pagination: {
                page,
                limit,
                total: result.total,
                pages: result.pages
            }
        });
    } catch (error) {
        logger.error('Error fetching admin news list:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;
