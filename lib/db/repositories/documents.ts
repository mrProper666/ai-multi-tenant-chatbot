import { getDbPool } from '../client';
import { Document } from '@/lib/types';

export async function createDocument(
  tenantId: string,
  documentId: string,
  filename: string,
  s3Key: string,
  fileSize: number,
  pageCount: number | null = null
): Promise<Document> {
  const pool = getDbPool();

  const result = await pool.query<Document>(
    `INSERT INTO documents (id, tenant_id, filename, s3_key, file_size, page_count)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [documentId, tenantId, filename, s3Key, fileSize, pageCount]
  );

  return result.rows[0];
}

export async function getDocumentById(tenantId: string, documentId: string): Promise<Document | null> {
  const pool = getDbPool();

  const result = await pool.query<Document>(
    `SELECT * FROM documents WHERE id = $1 AND tenant_id = $2`,
    [documentId, tenantId]
  );

  return result.rows[0] || null;
}

export async function listDocuments(tenantId: string): Promise<Document[]> {
  const pool = getDbPool();

  const result = await pool.query<Document>(
    `SELECT * FROM documents WHERE tenant_id = $1 ORDER BY uploaded_at DESC`,
    [tenantId]
  );

  return result.rows;
}

export async function deleteDocument(tenantId: string, documentId: string): Promise<void> {
  const pool = getDbPool();

  await pool.query(
    `DELETE FROM documents WHERE id = $1 AND tenant_id = $2`,
    [documentId, tenantId]
  );
}

export async function updateDocumentPageCount(
  tenantId: string,
  documentId: string,
  pageCount: number
): Promise<void> {
  const pool = getDbPool();

  await pool.query(
    `UPDATE documents SET page_count = $1 WHERE id = $2 AND tenant_id = $3`,
    [pageCount, documentId, tenantId]
  );
}
