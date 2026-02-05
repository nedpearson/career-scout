import { spawn } from "node:child_process";

function shouldRunDbPush() {
  const v = (process.env.CAREER_SCOUT_DB_PUSH_ON_START ?? "").toLowerCase().trim();
  return v === "true" || v === "1" || v === "yes";
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

if (!shouldRunDbPush()) {
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  const built = buildDatabaseUrlFromEnv(process.env);
  if (built) process.env.DATABASE_URL = built;
}

if (!process.env.DATABASE_URL) {
  console.error("[prestart] CAREER_SCOUT_DB_PUSH_ON_START is enabled but database env vars are missing.");
  process.exit(1);
}

console.log("[prestart] Running drizzle-kit push...");

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const child = spawn(npmCmd, ["run", "db:push"], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`[prestart] drizzle-kit push terminated by signal ${signal}`);
    process.exit(1);
  }
  process.exit(typeof code === "number" ? code : 1);
});

