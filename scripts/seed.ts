import { config } from 'dotenv';
import { resolve } from 'path';
import { createTenant } from '../lib/db/repositories/tenants';

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') });

async function seed() {
  try {
    console.log('Seeding database...');

    // Create a demo tenant
    const tenant = await createTenant('Demo NGO');
    console.log(`✓ Created tenant: ${tenant.name} (${tenant.id})`);

    console.log('Seeding completed!');
    console.log(`\nUse this Tenant ID for testing: ${tenant.id}`);
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
