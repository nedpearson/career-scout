import { spawn } from "node:child_process";
import path from "node:path";

// Railway (and some log aggregators) treat stderr as "error" logs.
// Prisma sometimes writes non-error status lines to stderr, so we pipe stderr -> stdout.

function buildDatabaseUrl(env) {
  const schemaRaw = typeof env.JOBTRACKER_DB_SCHEMA === "string" ? env.JOBTRACKER_DB_SCHEMA.trim() : "";
  const schema = schemaRaw || "jobtracker";
  const databaseUrl = typeof env.JOBTRACKER_DATABASE_URL === "string"
    ? env.JOBTRACKER_DATABASE_URL.trim()
    : (typeof env.DATABASE_URL === "string" ? env.DATABASE_URL.trim() : "");
  const isValidPgUrl = (v) => {
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
    env.POSTGRES_URL,
    env.POSTGRESQL_URL,
    env.POSTGRES_URL_NON_POOLING,
    env.POSTGRESQL_URL_NON_POOLING,
    env.DATABASE_PRIVATE_URL,
    env.DATABASE_PUBLIC_URL,
  ]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);

  // If it's already a valid Postgres URL, keep it.
  for (const c of candidates) {
    if (isValidPgUrl(c)) return c;
  }

  // Railway/managed Postgres often expose discrete PG* env vars.
  const host =
    env.PGHOST ??
    env.POSTGRES_HOST ??
    env.POSTGRESQL_HOST ??
    env.POSTGRES_PRIVATE_HOST;
  const port = env.PGPORT ?? env.POSTGRES_PORT ?? env.POSTGRESQL_PORT ?? "5432";
  const user = env.PGUSER ?? env.POSTGRES_USER ?? env.POSTGRESQL_USER;
  const password = env.PGPASSWORD ?? env.POSTGRES_PASSWORD ?? env.POSTGRESQL_PASSWORD;
  const database = env.PGDATABASE ?? env.POSTGRES_DB ?? env.POSTGRESQL_DB;

  if (!host || !user || !password || !database) {
    // If DATABASE_URL is set but malformed (e.g. missing scheme), keep *that* as a last resort
    // so Prisma can throw a clearer error (we intentionally do not fall back to other candidates).
    if (databaseUrl) return databaseUrl;
    return "";
  }

  const u = encodeURIComponent(user);
  const p = encodeURIComponent(password);
  const db = encodeURIComponent(database);
  return `postgresql://${u}:${p}@${host}:${port}/${db}?schema=${encodeURIComponent(schema)}`;
}

function redactDbUrl(url) {
  try {
    const u = new URL(url);
    const user = u.username ? `${u.username}:***` : "";
    const auth = user ? `${user}@` : "";
    return `${u.protocol}//${auth}${u.host}${u.pathname}${u.search}`;
  } catch {
    return "<unparseable>";
  }
}

const bin = process.platform === "win32" ? "prisma.cmd" : "prisma";
const prismaBin = path.join(process.cwd(), "node_modules", ".bin", bin);

const effectiveDatabaseUrl = buildDatabaseUrl(process.env);
if (!effectiveDatabaseUrl) {
  console.error(
    [
      "Prisma DATABASE_URL is empty.",
      "Set a non-empty DATABASE_URL in your deployment environment (Railway Variables),",
      "or connect a Postgres plugin/service so PGHOST/PGUSER/PGPASSWORD/PGDATABASE are available.",
    ].join(" "),
  );
  // Non-secret env presence diagnostics (helps pinpoint a miswired Railway variable quickly).
  console.error(
    `[prisma] env present: DATABASE_URL=${Boolean(process.env.DATABASE_URL)} PGHOST=${Boolean(process.env.PGHOST)} PGUSER=${Boolean(process.env.PGUSER)} PGDATABASE=${Boolean(process.env.PGDATABASE)} PGPASSWORD=${Boolean(process.env.PGPASSWORD)}`,
  );
  process.exit(1);
}

const child = spawn(prismaBin, ["migrate", "deploy"], {
  env: { ...process.env, DATABASE_URL: effectiveDatabaseUrl },
  stdio: ["inherit", "inherit", "pipe"],
  // Required to execute `.cmd` shims on Windows.
  shell: process.platform === "win32",
});

// Helpful, non-secret diagnostic (shows host/db, hides password).
console.log(`[prisma] Using DATABASE_URL: ${redactDbUrl(effectiveDatabaseUrl)}`);

child.stderr.on("data", (chunk) => {
  process.stdout.write(chunk);
});

child.on("error", (err) => {
  console.error(err);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (typeof code === "number") process.exit(code);
  console.error(`Prisma migrate deploy exited via signal ${signal ?? "unknown"}`);
  process.exit(1);
});

