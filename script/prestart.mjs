import { spawn } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

function shouldRunDbPush() {
  const v = (process.env.CAREER_SCOUT_DB_PUSH_ON_START ?? "").toLowerCase().trim();
  return v === "true" || v === "1" || v === "yes";
}

function withSchema(urlString, schema) {
  try {
    const u = new URL(urlString);
    u.searchParams.set("schema", schema);
    return u.toString();
  } catch {
    return urlString;
  }
}

function buildDatabaseUrlFromEnv(env) {
  const candidates = [
    env.DATABASE_URL,
    env.POSTGRES_URL,
    env.POSTGRESQL_URL,
    env.POSTGRES_URL_NON_POOLING,
    env.POSTGRESQL_URL_NON_POOLING,
    env.DATABASE_PRIVATE_URL,
    env.DATABASE_PUBLIC_URL,
  ]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);

  for (const c of candidates) {
    if (/^(postgresql|postgres):\/\//i.test(c)) return c;
  }

  const host =
    env.PGHOST ??
    env.POSTGRES_HOST ??
    env.POSTGRESQL_HOST ??
    env.POSTGRES_PRIVATE_HOST ??
    env.POSTGRESQL_PRIVATE_HOST;
  const port = env.PGPORT ?? env.POSTGRES_PORT ?? env.POSTGRESQL_PORT ?? "5432";
  const user = env.PGUSER ?? env.POSTGRES_USER ?? env.POSTGRESQL_USER;
  const password = env.PGPASSWORD ?? env.POSTGRES_PASSWORD ?? env.POSTGRESQL_PASSWORD;
  const database = env.PGDATABASE ?? env.POSTGRES_DB ?? env.POSTGRESQL_DB;

  if (!host || !user || !password || !database) return "";
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
}

function hasPrismaMigrations() {
  try {
    const pUrl = new URL("../prisma/migrations", import.meta.url);
    const p = fileURLToPath(pUrl);
    if (!fs.existsSync(p)) return false;
    const entries = fs.readdirSync(p);
    return entries.some((e) => !e.startsWith("."));
  } catch {
    return false;
  }
}

function runNpmScript(scriptName) {
  return new Promise((resolve, reject) => {
    const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
    const child = spawn(npmCmd, ["run", scriptName], {
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
    });
    child.on("exit", (code, signal) => {
      if (signal) return reject(new Error(`${scriptName} terminated by signal ${signal}`));
      if (code === 0) return resolve();
      reject(new Error(`${scriptName} exited with code ${code ?? 1}`));
    });
  });
}

if (!shouldRunDbPush()) {
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  const built = buildDatabaseUrlFromEnv(process.env);
  if (built) process.env.DATABASE_URL = built;
}

// Ensure Prisma (JobTracker) gets an explicit schema URL, so we don't collide with Drizzle/public.
if (!process.env.JOBTRACKER_DATABASE_URL && process.env.DATABASE_URL) {
  const schema = (process.env.JOBTRACKER_DB_SCHEMA || "jobtracker").trim() || "jobtracker";
  process.env.JOBTRACKER_DATABASE_URL = withSchema(process.env.DATABASE_URL, schema);
}

if (!process.env.DATABASE_URL) {
  console.error("[prestart] CAREER_SCOUT_DB_PUSH_ON_START is enabled but database env vars are missing.");
  process.exit(1);
}

// Ensure pgcrypto is available for gen_random_uuid()
try {
  const pgModule = await import("pg");
  const Pool = pgModule.default?.Pool ?? pgModule.Pool;
  if (Pool) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
    await pool.end();
    console.log("[prestart] pgcrypto extension OK");
  }
} catch (e) {
  console.warn("[prestart] Unable to ensure pgcrypto extension (continuing):", e?.message ?? e);
}

try {
  console.log("[prestart] Running drizzle-kit push...");
  await runNpmScript("db:push");

  if (process.env.JOBTRACKER_DATABASE_URL) {
    // Prefer migrations if present, otherwise fall back to db push.
    if (hasPrismaMigrations()) {
      console.log("[prestart] Running prisma migrate deploy...");
      await runNpmScript("prisma:migrate:deploy");
    } else {
      console.log("[prestart] Running prisma db push (no migrations yet)...");
      await runNpmScript("prisma:dbpush");
    }
  } else {
    console.warn("[prestart] JOBTRACKER_DATABASE_URL not set; skipping Prisma schema sync.");
  }

  process.exit(0);
} catch (e) {
  console.error("[prestart] Database setup failed:", e?.message ?? e);
  process.exit(1);
}

