import { getDbPool } from '@/lib/db/client';
import { VectorStore } from './vector-store';
import { ChunkWithMetadata } from '@/lib/types';

export class PgVectorStore implements VectorStore {
  async storeChunk(
    tenantId: string,
    documentId: string,
    chunkIndex: number,
    pageNumber: number,
    content: string,
    contentType: 'text' | 'table',
    tokenCount: number,
    vector: number[]
  ): Promise<void> {
    const pool = getDbPool();
    
    await pool.query(
      `INSERT INTO document_chunks 
       (tenant_id, document_id, chunk_index, page_number, content, content_type, token_count, vector)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector)
       ON CONFLICT (tenant_id, document_id, chunk_index) 
       DO UPDATE SET 
         content = EXCLUDED.content,
         content_type = EXCLUDED.content_type,
         token_count = EXCLUDED.token_count,
         vector = EXCLUDED.vector`,
      [tenantId, documentId, chunkIndex, pageNumber, content, contentType, tokenCount, JSON.stringify(vector)]
    );
  }

  async searchSimilar(
    tenantId: string,
    queryVector: number[],
    limit: number
  ): Promise<ChunkWithMetadata[]> {
    const pool = getDbPool();
    
    const result = await pool.query<ChunkWithMetadata & { document_name: string }>(
      `SELECT 
        dc.id,
        dc.tenant_id,
        dc.document_id,
        dc.chunk_index,
        dc.page_number,
        dc.content,
        dc.content_type,
        dc.token_count,
        dc.vector,
        dc.created_at,
        d.filename as document_name
      FROM document_chunks dc
      JOIN documents d ON dc.document_id = d.id
      WHERE dc.tenant_id = $1
      ORDER BY dc.vector <=> $2::vector
      LIMIT $3`,
      [tenantId, JSON.stringify(queryVector), limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      tenant_id: row.tenant_id,
      document_id: row.document_id,
      chunk_index: row.chunk_index,
      page_number: row.page_number,
      content: row.content,
      content_type: row.content_type as 'text' | 'table',
      token_count: row.token_count,
      vector: Array.from(row.vector as unknown as number[]),
      created_at: row.created_at,
      document_name: row.document_name,
    }));
  }

  async deleteDocumentChunks(tenantId: string, documentId: string): Promise<void> {
    const pool = getDbPool();
    
    await pool.query(
      'DELETE FROM document_chunks WHERE tenant_id = $1 AND document_id = $2',
      [tenantId, documentId]
    );
  }

  async deleteTenantChunks(tenantId: string): Promise<void> {
    const pool = getDbPool();
    
    await pool.query(
      'DELETE FROM document_chunks WHERE tenant_id = $1',
      [tenantId]
    );
  }
}
