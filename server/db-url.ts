function isPgUrl(v: string) {
  return /^(postgresql|postgres):\/\//i.test(v);
}

function enc(v: string) {
  return encodeURIComponent(v);
}

/**
 * Build a Postgres connection URL from common Railway/managed Postgres env vars.
 *
 * Railway sometimes provides discrete PG* vars, sometimes DATABASE_URL. This helper supports both.
 */
export function buildCareerScoutDatabaseUrl(): string | undefined {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRESQL_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.POSTGRESQL_URL_NON_POOLING,
    process.env.DATABASE_PRIVATE_URL,
    process.env.DATABASE_PUBLIC_URL,
  ]
    .map((v) => v?.trim())
    .filter((v): v is string => Boolean(v));

  for (const c of candidates) {
    if (isPgUrl(c)) return c;
  }

  const host =
    process.env.PGHOST ??
    process.env.POSTGRES_HOST ??
    process.env.POSTGRESQL_HOST ??
    process.env.POSTGRES_PRIVATE_HOST ??
    process.env.POSTGRESQL_PRIVATE_HOST;
  const port =
    process.env.PGPORT ??
    process.env.POSTGRES_PORT ??
    process.env.POSTGRESQL_PORT ??
    "5432";
  const user =
    process.env.PGUSER ??
    process.env.POSTGRES_USER ??
    process.env.POSTGRESQL_USER;
  const password =
    process.env.PGPASSWORD ??
    process.env.POSTGRES_PASSWORD ??
    process.env.POSTGRESQL_PASSWORD;
  const database =
    process.env.PGDATABASE ??
    process.env.POSTGRES_DB ??
    process.env.POSTGRESQL_DB;

  if (!host || !user || !password || !database) return undefined;

  return `postgresql://${enc(user)}:${enc(password)}@${host}:${port}/${enc(database)}`;
}

