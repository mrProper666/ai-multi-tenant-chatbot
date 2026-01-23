import { getDbPool } from '../client';
import { Tenant } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function createTenant(name: string): Promise<Tenant> {
  const pool = getDbPool();
  const id = uuidv4();

  const result = await pool.query<Tenant>(
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
