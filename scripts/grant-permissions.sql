-- Grant permissions to app_user
-- Run this script as postgres superuser: psql -U postgres -d app_dev -f scripts/grant-permissions.sql

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO app_user;

-- IMPORTANT:
-- GRANT is not enough for ALTER TABLE. DDL requires the role to be the OWNER.
-- This block changes ownership of existing tables/sequences in public schema to app_user.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO app_user', r.tablename);
  END LOOP;

  FOR r IN
    SELECT sequencename
    FROM pg_sequences
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER SEQUENCE public.%I OWNER TO app_user', r.sequencename);
  END LOOP;
END $$;
