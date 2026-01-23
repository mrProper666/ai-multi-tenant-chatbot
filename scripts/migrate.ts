import { readFileSync } from 'fs';
import { join } from 'path';
import { getDbPool } from '../lib/db/client';

async function migrate() {
  try {
    const pool = getDbPool();
    const schemaPath = join(process.cwd(), 'lib/db/schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    // Split by semicolons and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log('Running database migrations...');

    for (const statement of statements) {
      try {
        await pool.query(statement);
        console.log('✓ Executed statement');
      } catch (error: any) {
        // Ignore "already exists" errors
        if (error.message.includes('already exists')) {
          console.log('⚠ Statement already applied (skipping)');
        } else {
          throw error;
        }
      }
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
