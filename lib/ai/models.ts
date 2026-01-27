import { ModelId } from '@/lib/types';

export interface AllowedLlmModel {
  id: ModelId;
  label: string;
}

export interface AllowedEmbeddingModel {
  id: ModelId;
  label: string;
  dimensions: number;
}

/**
 * Keep this list intentionally small. It acts as:
 * - a UI dropdown source
 * - an API validation allowlist
 *
 * You can expand it once you confirm availability in your Vercel AI Gateway setup.
 */
export const ALLOWED_LLM_MODELS: readonly AllowedLlmModel[] = [
  { id: 'openai/gpt-4o-mini', label: 'OpenAI · GPT-4o mini' },
  { id: 'openai/gpt-4o', label: 'OpenAI · GPT-4o' },
  { id: 'anthropic/claude-haiku-4.5', label: 'Anthropic · Claude Haiku 4.5' },
  { id: 'anthropic/claude-sonnet-4.5', label: 'Anthropic · Claude Sonnet 4.5' },
] as const;

/**
 * IMPORTANT: Your current DB schema stores vectors in document_chunks.vector(3072).
 * Only include embedding models with 3072 dimensions unless you plan to migrate the DB + re-embed.
 */
export const ALLOWED_EMBEDDING_MODELS: readonly AllowedEmbeddingModel[] = [
  { id: 'openai/text-embedding-3-large', label: 'OpenAI · text-embedding-3-large', dimensions: 3072 },
  { id: 'google/gemini-embedding-001', label: 'Google · gemini-embedding-001', dimensions: 3072 },
] as const;

export function getAllowedEmbeddingModel(id: string): AllowedEmbeddingModel | undefined {
  return ALLOWED_EMBEDDING_MODELS.find(m => m.id === id);
}

export function assertAllowedLlmModelId(id: string): asserts id is ModelId {
  if (!ALLOWED_LLM_MODELS.some(m => m.id === id)) {
    throw new Error(`Unsupported LLM model_id: "${id}".`);
  }
}

export function assertAllowedEmbeddingModelSelection(id: string, embeddingDimensions: number): asserts id is ModelId {
  const allowed = getAllowedEmbeddingModel(id);
  if (!allowed) {
    throw new Error(`Unsupported embedding model_id: "${id}".`);
  }
  if (allowed.dimensions !== embeddingDimensions) {
    throw new Error(
      `Embedding dimensions mismatch for "${id}": expected ${allowed.dimensions}, got ${embeddingDimensions}.`
    );
  }
}

