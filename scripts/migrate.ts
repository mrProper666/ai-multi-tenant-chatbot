import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') });

async function migrate() {
  try {
    // Use elevated connection for DDL if provided (tables may be owned by another role).
    // Falls back to DATABASE_URL.
    const connectionString =
      process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    const pool = new Pool({
      connectionString,
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
    });
    const schemaPath = join(process.cwd(), 'lib/db/schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    // Split by semicolons and execute each statement.
    // IMPORTANT: comments (`-- ...`) can appear before statements; do not drop those statements.
    const statements = schema
      .split(';')
      .map((s) =>
        s
          // remove full-line SQL comments
          .replace(/^\s*--.*$/gm, '')
          .trim()
      )
      .filter((s) => s.length > 0);

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
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
