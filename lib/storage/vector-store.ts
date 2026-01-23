import { ChunkWithMetadata } from '@/lib/types';

/**
 * VectorStore abstraction interface
 * Allows future migration to different vector databases
 */
export interface VectorStore {
  /**
   * Store a chunk with its embedding vector
   */
  storeChunk(
    tenantId: string,
    documentId: string,
    chunkIndex: number,
    pageNumber: number,
    content: string,
    contentType: 'text' | 'table',
    tokenCount: number,
    vector: number[]
  ): Promise<void>;

  /**
   * Search for similar chunks within a tenant
   * Returns top-k most similar chunks
   */
  searchSimilar(
    tenantId: string,
    queryVector: number[],
    limit: number
  ): Promise<ChunkWithMetadata[]>;

  /**
   * Delete all chunks for a document
   */
  deleteDocumentChunks(tenantId: string, documentId: string): Promise<void>;

  /**
   * Delete all chunks for a tenant
   */
  deleteTenantChunks(tenantId: string): Promise<void>;
}
