/**
 * VectorizerService - SDK para integração com HiveLLM Vectorizer
 *
 * Fornece busca semântica, indexação de ofertas e cache inteligente
 * para o VoxelPromo.
 */

export interface VectorizerConfig {
  apiUrl: string;
  apiKey: string;
  defaultCollection?: string;
  timeout?: number;
}

export interface SearchResult {
  doc_id: string;
  collection: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
}

export interface SearchOptions {
  collection?: string;
  maxResults?: number;
  similarityThreshold?: number;
}

export interface InsertOptions {
  collection?: string;
  metadata?: Record<string, any>;
}

export interface VectorizerResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class VectorizerService {
  private config: VectorizerConfig;
  private isServiceAvailable: boolean | null = null;

  constructor(config?: Partial<VectorizerConfig>) {
    this.config = {
      apiUrl: config?.apiUrl || process.env.VECTORIZER_URL || 'http://127.0.0.1:15002',
      apiKey: config?.apiKey || process.env.VECTORIZER_API_KEY || '',
      defaultCollection: config?.defaultCollection || 'voxelpromo-backend',
      timeout: config?.timeout || 30000,
    };
    // Log configuration on startup to debug connection issues
    if (this.config.apiUrl.includes('localhost') || this.config.apiUrl.includes('127.0.0.1')) {
      console.log(
        `[Vectorizer] ⚠️ Using local API URL: ${this.config.apiUrl}. Ensure Vectorizer is running locally.`
      );
    } else {
      console.log(`[Vectorizer] 🚀 Using remote API URL: ${this.config.apiUrl}`);
    }
  }

  /**
   * Realiza busca semântica em uma collection
   */
  async search(
    query: string,
    options?: SearchOptions
  ): Promise<VectorizerResponse<SearchResult[]>> {
    try {
      const collection = options?.collection || this.config.defaultCollection;
      const response = await fetch(`${this.config.apiUrl}/collections/${collection}/search/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
        },
        body: JSON.stringify({
          query,
          max_results: options?.maxResults || 10,
          similarity_threshold: options?.similarityThreshold || 0.5,
        }),
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${error}` };
      }

      const data = await response.json();
      return { success: true, data: data.results || [] };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Busca ofertas similares a um texto
   */
  async searchSimilarOffers(query: string, maxResults = 5): Promise<SearchResult[]> {
    const result = await this.search(query, {
      collection: 'voxelpromo-services',
      maxResults,
    });
    return result.data || [];
  }

  /**
   * Busca em múltiplas collections
   */
  async searchAll(query: string, maxResults = 10): Promise<VectorizerResponse<SearchResult[]>> {
    try {
      const collections = ['voxelpromo-backend', 'voxelpromo-services', 'voxelpromo-docs'];
      const perCollection = Math.ceil(maxResults / collections.length);

      const results = await Promise.all(
        collections.map(collection =>
          this.search(query, { collection, maxResults: perCollection })
        )
      );

      const allResults = results.flatMap(r => r.data || []);
      allResults.sort((a, b) => b.score - a.score);
      return { success: true, data: allResults.slice(0, maxResults) };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Insere texto em uma collection
   */
  async insert(
    text: string,
    options?: InsertOptions
  ): Promise<VectorizerResponse<{ vector_id: string }>> {
    try {
      if (this.isServiceAvailable === false) {
        return { success: false, error: 'Vectorizer API offline (skipped silently)' };
      }

      const collection = options?.collection || this.config.defaultCollection;
      const response = await fetch(`${this.config.apiUrl}/collections/${collection}/texts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
        },
        body: JSON.stringify({
          text,
          metadata: options?.metadata || {},
        }),
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (!response.ok) {
        const error = await response.text();
        // Circuit-break on auth errors (401/403) to prevent log flooding
        if (response.status === 401 || response.status === 403) {
          this.isServiceAvailable = false;
        }
        return { success: false, error: `HTTP ${response.status}: ${error}` };
      }

      const data = await response.json();
      this.isServiceAvailable = true;
      return { success: true, data: { vector_id: data.vector_id || data.id } };
    } catch (_error) {
      this.isServiceAvailable = false;
      return { success: false, error: 'Vectorizer offline or unreachable' };
    }
  }

  /**
   * Verifica se o Vectorizer está online
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiUrl}/health`, {
        headers: {
          'X-API-Key': this.config.apiKey,
        },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Lista todas as collections disponíveis
   */
  async listCollections(): Promise<VectorizerResponse<string[]>> {
    try {
      const response = await fetch(`${this.config.apiUrl}/collections`, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
        },
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }

      const data = await response.json();
      const names = data.collections?.map((c: any) => c.name) || [];
      return { success: true, data: names };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}

// Singleton para uso global
let instance: VectorizerService | null = null;

export function getVectorizerService(config?: Partial<VectorizerConfig>): VectorizerService {
  if (!instance) {
    instance = new VectorizerService(config);
  }
  return instance;
}

export default VectorizerService;
