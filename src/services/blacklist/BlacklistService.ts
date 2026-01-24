import { logger } from '../../utils/logger';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface BlacklistConfig {
  enabled: boolean;
  keywords: string[];
  regex: string[];
}

export class BlacklistService {
  private config: BlacklistConfig | null = null;
  private compiledRegex: RegExp[] = [];

  constructor() {
    this.loadConfig();
  }

  /**
   * Load blacklist configuration from config.json
   */
  private loadConfig(): void {
    try {
      const configPath = join(process.cwd(), 'config.json');
      if (existsSync(configPath)) {
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        this.config = config.blacklist || { enabled: false, keywords: [], regex: [] };

        // Compile regex patterns
        if (this.config?.regex && this.config.regex.length > 0) {
          this.compiledRegex = this.config.regex.map((pattern) => new RegExp(pattern, 'i'));
        }

        logger.info(
          `Blacklist loaded: ${this.config?.keywords.length || 0} keywords, ${this.config?.regex.length || 0} regex patterns`
        );
      } else {
        this.config = { enabled: false, keywords: [], regex: [] };
      }
    } catch (error) {
      logger.error('Error loading blacklist config:', error);
      this.config = { enabled: false, keywords: [], regex: [] };
    }
  }

  /**
   * Reload configuration (call after config.json changes)
   */
  reload(): void {
    this.loadConfig();
  }

  /**
   * Check if a text matches any blacklist rule
   */
  isBlacklisted(text: string): boolean {
    if (!this.config || !this.config.enabled) {
      return false;
    }

    const lowerText = text.toLowerCase();

    // Check keywords
    for (const keyword of this.config.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        logger.debug(`Blacklist match (keyword): "${keyword}" in "${text.substring(0, 50)}..."`);
        return true;
      }
    }

    // Check regex patterns
    for (const regex of this.compiledRegex) {
      if (regex.test(text)) {
        logger.debug(`Blacklist match (regex): ${regex.source} in "${text.substring(0, 50)}..."`);
        return true;
      }
    }

    return false;
  }

  /**
   * Check if an offer should be blacklisted
   * Checks title, description, and brand
   */
  isOfferBlacklisted(offer: { title: string; description?: string; brand?: string }): boolean {
    if (!this.config || !this.config.enabled) {
      return false;
    }

    // Check title
    if (this.isBlacklisted(offer.title)) {
      return true;
    }

    // Check description
    if (offer.description && this.isBlacklisted(offer.description)) {
      return true;
    }

    // Check brand
    if (offer.brand && this.isBlacklisted(offer.brand)) {
      return true;
    }

    return false;
  }

  /**
   * Get current blacklist configuration
   */
  getConfig(): BlacklistConfig {
    return this.config || { enabled: false, keywords: [], regex: [] };
  }

  /**
   * Get blacklist statistics
   */
  getStats(): { enabled: boolean; keywordCount: number; regexCount: number } {
    return {
      enabled: this.config?.enabled || false,
      keywordCount: this.config?.keywords.length || 0,
      regexCount: this.config?.regex.length || 0,
    };
  }
}
