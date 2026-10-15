import { Injectable, Logger } from '@nestjs/common';

/** Must match the RagChunk.embedding column type (vector(768)). */
export const RAG_EMBEDDING_DIMENSIONS = 768;

/**
 * Embeddings through an OpenAI-compatible /embeddings endpoint (OpenAI or
 * Ollama). Enabled when RAG_EMBEDDING_MODEL is set, e.g. "nomic-embed-text"
 * for Ollama or "text-embedding-3-small" for OpenAI (which supports the
 * `dimensions` parameter). RAG_EMBEDDING_API_URL defaults to OPENAI_API_URL
 * with /chat/completions replaced by /embeddings. Failures never block
 * ingestion or search: callers fall back to keyword retrieval.
 */
@Injectable()
export class RagEmbeddingService {
  private readonly logger = new Logger(RagEmbeddingService.name);
  readonly model = process.env.RAG_EMBEDDING_MODEL?.trim() || '';
  private readonly url = process.env.RAG_EMBEDDING_API_URL?.trim()
    || (process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions').replace(/\/chat\/completions\/?$/, '/embeddings');

  get enabled(): boolean {
    return Boolean(this.model);
  }

  /** Returns one vector per input, or null when embeddings are disabled or the provider fails. */
  async embed(texts: string[]): Promise<number[][] | null> {
    if (!this.enabled || texts.length === 0) return null;
    const vectors: number[][] = [];
    try {
      for (let start = 0; start < texts.length; start += 32) {
        const batch = texts.slice(start, start + 32);
        const response = await fetch(this.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(process.env.OPENAI_API_KEY ? { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } : {}) },
          body: JSON.stringify({ model: this.model, input: batch, dimensions: RAG_EMBEDDING_DIMENSIONS }),
        });
        if (!response.ok) throw new Error(`embedding request failed with status ${response.status}`);
        const payload = await response.json() as { data?: Array<{ embedding?: number[]; index?: number }> };
        const data = [...(payload.data || [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
        if (data.length !== batch.length) throw new Error(`expected ${batch.length} embeddings, received ${data.length}`);
        for (const item of data) {
          if (item.embedding?.length !== RAG_EMBEDDING_DIMENSIONS) throw new Error(`model returned ${item.embedding?.length ?? 0} dimensions; ${RAG_EMBEDDING_DIMENSIONS} required`);
          vectors.push(item.embedding);
        }
      }
      return vectors;
    } catch (error) {
      this.logger.warn(`RAG embeddings unavailable (${this.model}): ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /** pgvector literal for a Prisma raw query parameter (cast with ::vector). */
  static toVectorLiteral(vector: number[]): string {
    return `[${vector.map((value) => (Number.isFinite(value) ? value : 0)).join(',')}]`;
  }
}
