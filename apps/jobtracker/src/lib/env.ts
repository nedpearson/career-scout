import { z } from "zod";

function buildDatabaseUrl(): string | undefined {
  const schema = (process.env.JOBTRACKER_DB_SCHEMA || "jobtracker").trim() || "jobtracker";
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
    // Prefer namespaced variables when embedded into another app.
    process.env.JOBTRACKER_DATABASE_URL,
    process.env.DATABASE_URL,
    // Common managed-Postgres variants
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
    if (isValidPgUrl(c)) return c;
  }

  // Railway Postgres (and many managed Postgres providers) expose discrete PG* env vars.
  // If DATABASE_URL is missing OR malformed (e.g. missing scheme), reconstruct it.
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
    // We intentionally do NOT return a non-postgres candidate (e.g. "file:./dev.db"),
    // because this app is configured for Postgres.
    //
    // Local dev default (keeps builds from crashing when env vars aren't set).
    return "postgresql://postgres:postgres@localhost:5432/jobtracker?schema=public";
  }

  const u = encodeURIComponent(user);
  const p = encodeURIComponent(password);
  const db = encodeURIComponent(database);
  return `postgresql://${u}:${p}@${host}:${port}/${db}?schema=${encodeURIComponent(schema)}`;
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  // AUTH_SECRET is required for Auth.js at runtime, but some build environments
  // don't provide secrets during `next build` / route module evaluation.
  // We validate it in the auth layer instead of crashing unrelated builds.
  AUTH_SECRET: z.string().optional().default(""),
  // Auth.js/NextAuth reads these directly from process.env, but we keep them here
  // so deployments fail fast if you choose to validate them later.
  AUTH_URL: z.string().optional().default(""),
  AUTH_TRUST_HOST: z.string().optional().default(""),
  AUTH_GOOGLE_ID: z.string().optional().default(""),
  AUTH_GOOGLE_SECRET: z.string().optional().default(""),
  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_MODEL: z.string().optional().default("gpt-4o-mini"),
  SERPAPI_API_KEY: z.string().optional().default(""),
  ALLOW_DEV_LOGIN: z.string().optional().default("true"),
  // Allows anyone to one-click into a seeded demo account from /signin.
  // Set to "false" if you don't want public demo access.
  ALLOW_DEMO_LOGIN: z.string().optional().default("true")
});

export const env = envSchema.parse({
  DATABASE_URL: buildDatabaseUrl(),
  AUTH_SECRET: process.env.JOBTRACKER_AUTH_SECRET ?? process.env.AUTH_SECRET,
  AUTH_URL: process.env.JOBTRACKER_AUTH_URL ?? process.env.AUTH_URL,
  AUTH_TRUST_HOST: process.env.JOBTRACKER_AUTH_TRUST_HOST ?? process.env.AUTH_TRUST_HOST,
  AUTH_GOOGLE_ID: process.env.JOBTRACKER_AUTH_GOOGLE_ID ?? process.env.AUTH_GOOGLE_ID,
  AUTH_GOOGLE_SECRET: process.env.JOBTRACKER_AUTH_GOOGLE_SECRET ?? process.env.AUTH_GOOGLE_SECRET,
  OPENAI_API_KEY: process.env.JOBTRACKER_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.JOBTRACKER_OPENAI_MODEL ?? process.env.OPENAI_MODEL,
  SERPAPI_API_KEY: process.env.JOBTRACKER_SERPAPI_API_KEY ?? process.env.SERPAPI_API_KEY,
  ALLOW_DEV_LOGIN: process.env.JOBTRACKER_ALLOW_DEV_LOGIN ?? process.env.ALLOW_DEV_LOGIN,
  ALLOW_DEMO_LOGIN: process.env.JOBTRACKER_ALLOW_DEMO_LOGIN ?? process.env.ALLOW_DEMO_LOGIN
});

