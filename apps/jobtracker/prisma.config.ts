import "dotenv/config";
import { defineConfig } from "prisma/config";

function buildDatabaseUrl(): string {
  const schema = (process.env.JOBTRACKER_DB_SCHEMA || "jobtracker").trim() || "jobtracker";
  const databaseUrl =
    (process.env.JOBTRACKER_DATABASE_URL ?? process.env.DATABASE_URL)?.trim();
  const isValidPgUrl = (v: string) => {
    if (!/^(postgresql|postgres):\/\//i.test(v)) return false;
    try {
      const u = new URL(v);
      return Boolean(u.hostname);
    } catch {
      return false;
    }
  };
  const candidates = [
    databaseUrl,
    process.env.POSTGRES_URL,
    process.env.POSTGRESQL_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.POSTGRESQL_URL_NON_POOLING,
    process.env.DATABASE_PRIVATE_URL,
    process.env.DATABASE_PUBLIC_URL
  ]
    .map((v) => v?.trim())
    .filter((v): v is string => Boolean(v));

  // If it's already a valid Postgres URL, keep it.
  for (const c of candidates) {
    if (c && isValidPgUrl(c)) return c;
  }

  // Railway/managed Postgres often expose discrete PG* env vars.
  const host =
    process.env.PGHOST ??
    process.env.POSTGRES_HOST ??
    process.env.POSTGRESQL_HOST ??
    process.env.POSTGRES_PRIVATE_HOST;
  const port = process.env.PGPORT ?? process.env.POSTGRES_PORT ?? process.env.POSTGRESQL_PORT ?? "5432";
  const user = process.env.PGUSER ?? process.env.POSTGRES_USER ?? process.env.POSTGRESQL_USER;
  const password = process.env.PGPASSWORD ?? process.env.POSTGRES_PASSWORD ?? process.env.POSTGRESQL_PASSWORD;
  const database = process.env.PGDATABASE ?? process.env.POSTGRES_DB ?? process.env.POSTGRESQL_DB;

  if (!host || !user || !password || !database) {
    // If DATABASE_URL is set but malformed (e.g. missing scheme), keep *that* as a last resort
    // so Prisma can throw a clearer error (we intentionally do not fall back to other candidates).
    if (databaseUrl) return databaseUrl;
    return "postgresql://postgres:postgres@localhost:5432/jobtracker?schema=public";
  }

  const u = encodeURIComponent(user);
  const p = encodeURIComponent(password);
  const db = encodeURIComponent(database);
  return `postgresql://${u}:${p}@${host}:${port}/${db}?schema=${encodeURIComponent(schema)}`;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations"
  },
  datasource: {
    // Treat empty/whitespace DATABASE_URL as missing, and reconstruct from PG* vars when present.
    url: buildDatabaseUrl()
  }
});
