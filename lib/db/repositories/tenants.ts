import { getDbPool } from '../client';
import { ModelId, Tenant } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function createTenant(name: string): Promise<Tenant> {
  const pool = getDbPool();
  const id = uuidv4();

  const result = await pool.query<Tenant>(
    // model settings use DB defaults (see schema.sql)
    `INSERT INTO tenants (id, name) VALUES ($1, $2) RETURNING *`,
    [id, name]
  );

  return result.rows[0];
}

export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  const pool = getDbPool();

  const result = await pool.query<Tenant>(
    `SELECT * FROM tenants WHERE id = $1`,
    [tenantId]
  );

  return result.rows[0] || null;
}

export interface TenantModelSettings {
  llm_model_id: ModelId;
  embedding_model_id: ModelId;
  embedding_dimensions: number;
}

export async function getTenantModelSettings(tenantId: string): Promise<TenantModelSettings | null> {
  const pool = getDbPool();

  const result = await pool.query<TenantModelSettings>(
    `SELECT llm_model_id, embedding_model_id, embedding_dimensions
     FROM tenants
     WHERE id = $1`,
    [tenantId]
  );

  return result.rows[0] || null;
}

export interface UpdateTenantModelSettingsInput {
  llm_model_id?: ModelId;
  embedding_model_id?: ModelId;
  embedding_dimensions?: number;
}

export async function updateTenantModelSettings(
  tenantId: string,
  input: UpdateTenantModelSettingsInput
): Promise<TenantModelSettings | null> {
  const pool = getDbPool();

  const result = await pool.query<TenantModelSettings>(
    `UPDATE tenants
     SET
       llm_model_id = COALESCE($2, llm_model_id),
       embedding_model_id = COALESCE($3, embedding_model_id),
       embedding_dimensions = COALESCE($4, embedding_dimensions),
       updated_at = NOW()
     WHERE id = $1
     RETURNING llm_model_id, embedding_model_id, embedding_dimensions`,
    [
      tenantId,
      input.llm_model_id ?? null,
      input.embedding_model_id ?? null,
      input.embedding_dimensions ?? null,
    ]
  );

  return result.rows[0] || null;
}
