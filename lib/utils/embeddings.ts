import { embed, embedMany } from 'ai';
import { assertAllowedEmbeddingModelSelection } from '@/lib/ai/models';
import { getTenantModelSettings } from '@/lib/db/repositories/tenants';

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    result.push(items.slice(i, i + chunkSize));
  }
  return result;
}

/**
 * Generate embedding for a text chunk
 * Uses tenant-selected embedding model_id via Vercel AI Gateway (AI SDK).
 */
export async function generateEmbedding(text: string, tenantId: string): Promise<number[]> {
  const settings = await getTenantModelSettings(tenantId);
  if (!settings) {
    throw new Error('Tenant not found');
  }

  assertAllowedEmbeddingModelSelection(settings.embedding_model_id, settings.embedding_dimensions);

  try {
    const { embedding } = await embed({
      model: settings.embedding_model_id,
      value: text,
    });
    return embedding;
  } catch (error: any) {
    if (error?.message) throw error;
    throw new Error(`Failed to generate embedding: ${error?.toString() || 'Unknown error'}`);
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[], tenantId: string): Promise<number[][]> {
  const settings = await getTenantModelSettings(tenantId);
  if (!settings) {
    throw new Error('Tenant not found');
  }

  assertAllowedEmbeddingModelSelection(settings.embedding_model_id, settings.embedding_dimensions);

  try {
    if (texts.length === 0) return [];

    // Vercel AI Gateway routes to providers with different batch limits.
    // Safe default: keep batches <= 100 (Google batchEmbedContents limit via gateway).
    const BATCH_SIZE = 100;
    const batches = chunkArray(texts, BATCH_SIZE);

    const allEmbeddings: number[][] = [];
    for (const values of batches) {
      const { embeddings } = await embedMany({
        model: settings.embedding_model_id,
        values,
        // avoid overwhelming providers (especially when chunking large PDFs)
        maxParallelCalls: 2,
      });
      allEmbeddings.push(...embeddings);
    }

    return allEmbeddings;
  } catch (error: any) {
    if (error?.message) throw error;
    throw new Error(`Failed to generate embeddings: ${error?.toString() || 'Unknown error'}`);
  }
}
