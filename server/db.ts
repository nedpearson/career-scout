import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { buildCareerScoutDatabaseUrl } from "./db-url";

const { Pool } = pg;

const effectiveDatabaseUrl =
  process.env.DATABASE_URL?.trim() || buildCareerScoutDatabaseUrl();

if (!effectiveDatabaseUrl) {
  throw new Error(
    "Database is not configured. Set DATABASE_URL or attach a Postgres service (PGHOST/PGUSER/PGPASSWORD/PGDATABASE).",
  );
}

// Ensure downstream tooling (e.g., drizzle-kit) sees DATABASE_URL when possible.
process.env.DATABASE_URL = effectiveDatabaseUrl;

export const pool = new Pool({ connectionString: effectiveDatabaseUrl });
export const db = drizzle(pool, { schema });
