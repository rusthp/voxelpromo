import express from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';

const router = express.Router();
const configPath = join(process.cwd(), 'config.json');

/**
 * POST /api/fix/collection-sources
 * Fixes the collection sources configuration
 */
router.post('/collection-sources', (_req, res) => {
  try {
    if (!existsSync(configPath)) {
      return res.status(404).json({
        success: false,
        error: 'config.json not found',
        path: configPath,
      });
    }

    // Read current config
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));

    logger.info('Current collection sources:', config.collection?.sources);

    // Enable all sources
    const allSources = ['amazon', 'aliexpress', 'mercadolivre', 'shopee', 'rss'];

    config.collection = {
      ...config.collection,
      enabled: true,
      sources: allSources,
    };

    // Save updated config
    writeFileSync(configPath, JSON.stringify(config, null, 2));

    logger.info('✅ Updated collection sources:', config.collection.sources);

    return res.json({
      success: true,
      message: 'Collection sources updated successfully!',
      before: config.collection?.sources || [],
      after: allSources,
      sources: allSources,
    });
  } catch (error: any) {
    logger.error('Error fixing collection sources:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
