-- Local Postgres bootstrap for Career Scout / JobTracker dev.
--
-- This script is executed automatically by the official `postgres` image on
-- first container startup (when the data volume is empty).
--
-- Goals:
-- - Create database: jobtracker_local
-- - Ensure pgcrypto exists for Drizzle `gen_random_uuid()`
-- - Ensure optional schema `jobtracker` exists (even if you choose to run Prisma in `public`)

-- Create the application database if it doesn't exist.
SELECT 'CREATE DATABASE jobtracker_local'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'jobtracker_local')\gexec

\connect jobtracker_local

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS jobtracker;

