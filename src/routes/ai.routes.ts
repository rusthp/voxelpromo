import { Router } from 'express';
import { AIService } from '../services/ai/AIService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/ai/test
 * Test AI provider connection
 */
router.post('/test', async (req, res) => {
  try {
    const { provider, apiKey } = req.body;

    if (!provider) {
      return res.status(400).json({ error: 'Provedor não especificado' });
    }

    const aiService = new AIService();
    const result = await aiService.testConnection(provider, apiKey);

    return res.json(result);
  } catch (error: any) {
    logger.error('AI test connection error:', error.message);
    return res.status(400).json({
      success: false,
      error: error.message || 'Erro ao testar conexão',
    });
  }
});

/**
 * GET /api/ai/providers
 * Get available AI providers
 */
router.get('/providers', (_req, res) => {
  return res.json({
    providers: [
      { id: 'groq', name: 'Groq', description: 'Fast LLM inference (free tier available)' },
      { id: 'openai', name: 'OpenAI', description: 'GPT-4 and GPT-3.5' },
      { id: 'deepseek', name: 'DeepSeek', description: 'Cost-effective AI (Chinese provider)' },
    ],
  });
});

export const aiRoutes = router;
