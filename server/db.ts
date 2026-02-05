import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { buildCareerScoutDatabaseUrl } from "./db-url";

const { Pool } = pg;

const effectiveDatabaseUrl =
  process.env.DATABASE_URL?.trim() || buildCareerScoutDatabaseUrl();

const DB_NOT_CONFIGURED_MESSAGE =
  "Database is not configured. Set DATABASE_URL or attach a Postgres service (PGHOST/PGUSER/PGPASSWORD/PGDATABASE).";

/**
 * Important: do **not** throw at import-time.
 *
 * Some deploy environments boot the web process before the database is attached
 * (or before secrets are injected), and crashing on module import causes a
 * restart loop that makes debugging harder.
 *
 * Instead we export a proxy `db` that throws *when used* if the DB isn't set.
 */
function makeDbMissingProxy(): any {
  const err = () => new Error(DB_NOT_CONFIGURED_MESSAGE);
  const handler: ProxyHandler<object> = {
    get() {
      throw err();
    },
    apply() {
      throw err();
    },
  };
  return new Proxy(function () {}, handler);
}

export const pool = effectiveDatabaseUrl
  ? new Pool({ connectionString: effectiveDatabaseUrl })
  : undefined;

export const db = effectiveDatabaseUrl
  ? (() => {
      // Ensure downstream tooling (e.g., drizzle-kit) sees DATABASE_URL when possible.
      process.env.DATABASE_URL = effectiveDatabaseUrl;
      return drizzle(pool!, { schema });
    })()
  : (console.warn(`[db] ${DB_NOT_CONFIGURED_MESSAGE}`), makeDbMissingProxy());
