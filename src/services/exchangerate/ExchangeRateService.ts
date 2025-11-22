import axios from 'axios';
import { logger } from '../../utils/logger';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

interface ExchangeRateCache {
  rate: number;
  timestamp: number;
  source: string;
}

/**
 * Exchange Rate Service
 * Fetches real-time USD to BRL exchange rate from free APIs
 * Caches rate for 1 hour to avoid excessive API calls
 */
export class ExchangeRateService {
  private cacheFile = join(process.cwd(), 'scripts', '.exchange-rate-cache.json');
  private cacheDuration = 60 * 60 * 1000; // 1 hour in milliseconds

  /**
   * Get USD to BRL exchange rate
   * Tries real-time API first, falls back to cached rate, then config, then default
   */
  async getUSDtoBRLRate(): Promise<number> {
    try {
      // Try to get from cache first (if recent)
      const cachedRate = this.getCachedRate();
      if (cachedRate && this.isCacheValid(cachedRate.timestamp)) {
        logger.debug('Using cached exchange rate', {
          rate: cachedRate.rate,
          source: cachedRate.source,
          cachedAt: new Date(cachedRate.timestamp).toISOString()
        });
        return cachedRate.rate;
      }

      // Try to fetch from real-time API
      const realTimeRate = await this.fetchRealTimeRate();
      if (realTimeRate) {
        // Cache the rate
        this.cacheRate(realTimeRate, 'api');
        logger.info('✅ Fetched real-time exchange rate', {
          rate: realTimeRate,
          source: 'real-time API'
        });
        return realTimeRate;
      }

      // Fallback to cached rate (even if old)
      if (cachedRate) {
        logger.warn('⚠️ Using cached exchange rate (real-time API unavailable)', {
          rate: cachedRate.rate,
          source: cachedRate.source,
          cachedAt: new Date(cachedRate.timestamp).toISOString()
        });
        return cachedRate.rate;
      }

      // Fallback to config
      const configRate = this.getConfigRate();
      if (configRate) {
        logger.info('Using exchange rate from config', {
          rate: configRate,
          source: 'config.json'
        });
        return configRate;
      }

      // Final fallback to default
      logger.warn('⚠️ Using default exchange rate (5.0) - consider updating config.json', {
        rate: 5.0,
        source: 'default'
      });
      return 5.0;
    } catch (error: any) {
      logger.error('Error getting exchange rate, using fallback:', error.message);
      return this.getConfigRate() || 5.0;
    }
  }

  /**
   * Fetch real-time exchange rate from free API
   * Tries multiple APIs as fallback
   */
  private async fetchRealTimeRate(): Promise<number | null> {
    const apis = [
      // API 1: ExchangeRate-API (free, no API key needed for USD/BRL)
      async () => {
        try {
          const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', {
            timeout: 5000
          });
          const rate = response.data?.rates?.BRL;
          if (rate && rate > 3 && rate < 7) {
            return rate;
          }
        } catch (error) {
          // Silent fail, try next API
        }
        return null;
      },

      // API 2: Fixer.io free tier (requires API key, but we try without first)
      async () => {
        try {
          // Try without API key first (may have rate limits)
          const response = await axios.get('https://api.fixer.io/latest?base=USD&symbols=BRL', {
            timeout: 5000
          });
          const rate = response.data?.rates?.BRL;
          if (rate && rate > 3 && rate < 7) {
            return rate;
          }
        } catch (error) {
          // Silent fail, try next API
        }
        return null;
      },

      // API 3: CurrencyAPI (free tier)
      async () => {
        try {
          const response = await axios.get('https://api.currencyapi.com/v3/latest?apikey=free&currencies=BRL&base_currency=USD', {
            timeout: 5000
          });
          const rate = response.data?.data?.BRL?.value;
          if (rate && rate > 3 && rate < 7) {
            return rate;
          }
        } catch (error) {
          // Silent fail
        }
        return null;
      }
    ];

    // Try each API in order
    for (const api of apis) {
      try {
        const rate = await api();
        if (rate) {
          return rate;
        }
      } catch (error) {
        // Continue to next API
        continue;
      }
    }

    return null;
  }

  /**
   * Get cached exchange rate
   */
  private getCachedRate(): ExchangeRateCache | null {
    try {
      if (existsSync(this.cacheFile)) {
        const cache = JSON.parse(readFileSync(this.cacheFile, 'utf-8'));
        return cache;
      }
    } catch (error) {
      // Cache file doesn't exist or is invalid
    }
    return null;
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(timestamp: number): boolean {
    const now = Date.now();
    const age = now - timestamp;
    return age < this.cacheDuration;
  }

  /**
   * Cache exchange rate
   */
  private cacheRate(rate: number, source: string): void {
    try {
      const cache: ExchangeRateCache = {
        rate,
        timestamp: Date.now(),
        source
      };
      writeFileSync(this.cacheFile, JSON.stringify(cache, null, 2), 'utf-8');
    } catch (error) {
      // Failed to cache, but that's okay
      logger.debug('Failed to cache exchange rate:', error);
    }
  }

  /**
   * Get exchange rate from config.json
   */
  private getConfigRate(): number | null {
    try {
      const configPath = join(process.cwd(), 'config.json');
      if (existsSync(configPath)) {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        if (config.aliexpress?.exchangeRate) {
          return parseFloat(config.aliexpress.exchangeRate);
        }
      }
    } catch (error) {
      // Config doesn't exist or is invalid
    }
    return null;
  }

  /**
   * Force refresh exchange rate (bypass cache)
   */
  async refreshRate(): Promise<number> {
    const rate = await this.fetchRealTimeRate();
    if (rate) {
      this.cacheRate(rate, 'api');
      return rate;
    }
    throw new Error('Failed to fetch real-time exchange rate');
  }
}

