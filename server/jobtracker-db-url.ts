function isPgUrl(v: string) {
  return /^(postgresql|postgres):\/\//i.test(v);
}

function withSchema(urlString: string, schema: string): string {
  // Add or override the `schema` query param (Prisma convention).
  try {
    const u = new URL(urlString);
    u.searchParams.set("schema", schema);
    return u.toString();
  } catch {
    return urlString;
  }
}

/**
 * Build a Postgres URL for the JobTracker Prisma schema.
 *
 * We intentionally keep this separate from `DATABASE_URL` so Drizzle can keep
 * using the default `public` schema without ambiguity.
 */
export function buildJobtrackerDatabaseUrl(): string | undefined {
  const schema = (process.env.JOBTRACKER_DB_SCHEMA || "jobtracker").trim() || "jobtracker";

  const candidates = [
    process.env.JOBTRACKER_DATABASE_URL,
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRESQL_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.POSTGRESQL_URL_NON_POOLING,
    process.env.DATABASE_PRIVATE_URL,
    process.env.DATABASE_PUBLIC_URL,
  ]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);

  for (const c of candidates) {
    if (isPgUrl(c)) return withSchema(c, schema);
  }

  const host =
    process.env.PGHOST ??
    process.env.POSTGRES_HOST ??
    process.env.POSTGRESQL_HOST ??
    process.env.POSTGRES_PRIVATE_HOST ??
    process.env.POSTGRESQL_PRIVATE_HOST;
  const port = process.env.PGPORT ?? process.env.POSTGRES_PORT ?? process.env.POSTGRESQL_PORT ?? "5432";
  const user = process.env.PGUSER ?? process.env.POSTGRES_USER ?? process.env.POSTGRESQL_USER;
  const password = process.env.PGPASSWORD ?? process.env.POSTGRES_PASSWORD ?? process.env.POSTGRESQL_PASSWORD;
  const database = process.env.PGDATABASE ?? process.env.POSTGRES_DB ?? process.env.POSTGRESQL_DB;

  if (!host || !user || !password || !database) return undefined;

  const u = encodeURIComponent(user);
  const p = encodeURIComponent(password);
  const db = encodeURIComponent(database);
  return `postgresql://${u}:${p}@${host}:${port}/${db}?schema=${encodeURIComponent(schema)}`;
}

