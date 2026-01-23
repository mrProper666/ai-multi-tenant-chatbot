import { PgVectorStore } from '@/lib/storage/vector-store-pgvector';
import { generateEmbedding } from '@/lib/utils/embeddings';
import { ChunkWithMetadata } from '@/lib/types';

const vectorStore = new PgVectorStore();

/**
 * Retrieve relevant chunks for a query
 * Returns 5-8 most relevant chunks filtered by tenant
 */
export async function retrieveRelevantChunks(
  tenantId: string,
  query: string,
  limit: number = 7
): Promise<ChunkWithMetadata[]> {
  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  // Search for similar chunks (already tenant-filtered)
  const chunks = await vectorStore.searchSimilar(tenantId, queryEmbedding, limit);

  return chunks;
}

/**
 * Format chunks for LLM context with citations
 */
export function formatChunksForContext(chunks: ChunkWithMetadata[]): string {
  return chunks
    .map((chunk, index) => {
      return `[${index + 1}] Document: ${chunk.document_name}, Page ${chunk.page_number}\nContent: ${chunk.content}`;
    })
    .join('\n\n');
}

/**
 * Extract citations from chunks
 */
export function extractCitations(chunks: ChunkWithMetadata[]): any[] {
  return chunks.map(chunk => ({
    chunk_id: chunk.id,
    document_id: chunk.document_id,
    document_name: chunk.document_name,
    page_number: chunk.page_number,
    chunk_index: chunk.chunk_index,
  }));
}
