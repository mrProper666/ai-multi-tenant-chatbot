import { headers } from 'next/headers';

/**
 * Get tenant ID from request headers
 * TODO: Implement proper tenant resolution (JWT, subdomain, etc.)
 */
export async function getTenantId(): Promise<string> {
  const headersList = await headers();
  const tenantHeaderName = process.env.TENANT_HEADER_NAME || 'X-Tenant-Id';
  const tenantId = headersList.get(tenantHeaderName);

  if (!tenantId) {
    throw new Error('Tenant ID is required. Please provide it via header or implement proper tenant resolution.');
  }

  return tenantId;
}

/**
 * Validate tenant ID format (UUID)
 */
export function validateTenantId(tenantId: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(tenantId);
}
