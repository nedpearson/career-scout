import process from "node:process";

function redact(u) {
  return {
    protocol: u.protocol,
    host: u.hostname || "(missing)",
    port: u.port || "(default)",
    database: (u.pathname || "/").replace(/^\//, "") || "(missing)",
    user: u.username ? `${u.username.slice(0, 2)}***` : "(missing)",
    hasPassword: Boolean(u.password),
    params: Object.fromEntries(u.searchParams.entries()),
  };
}

function buildFromParts(parts) {
  const { host, port, user, password, database } = parts;
  if (!host) return { ok: false, reason: "missing host" };
  if (!user) return { ok: false, reason: "missing user" };
  if (!database) return { ok: false, reason: "missing database" };

  const encUser = encodeURIComponent(user);
  const encPass = password ? encodeURIComponent(password) : "";
  const auth = encPass ? `${encUser}:${encPass}` : `${encUser}`;
  const p = port ? String(port) : "5432";
  const qs = "sslmode=require";
  const url = `postgresql://${auth}@${host}:${p}/${encodeURIComponent(database)}?${qs}`;
  return { ok: true, url };
}

function isValidPostgresUrl(raw) {
  if (!raw) return { ok: false, reason: "empty" };
  try {
    const u = new URL(raw);
    if (!u.hostname) return { ok: false, reason: "empty host" };
    if (u.protocol !== "postgres:" && u.protocol !== "postgresql:") {
      return { ok: false, reason: `bad protocol ${u.protocol}` };
    }
    return { ok: true, url: u };
  } catch (e) {
    return { ok: false, reason: "unparseable" };
  }
}

export function getDatabaseUrlOrThrow() {
  const raw = (process.env.DATABASE_URL || "").trim();

  // 1) Try direct parse first
  if (raw) {
    const parsed = isValidPostgresUrl(raw);
    if (parsed.ok) {
      const u = parsed.url;
      // normalize protocol
      u.protocol = "postgresql:";
      // Preserve existing query params exactly as provided.
      return { url: u.toString(), redacted: redact(u), source: "DATABASE_URL" };
    }
  }

  // 2) Try Railway/common parts (prefer in requested order)
  const candidates = [
    {
      name: "PG*",
      host: process.env.PGHOST,
      port: process.env.PGPORT,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
    },
    {
      name: "POSTGRES_*",
      host: process.env.POSTGRES_HOST,
      port: process.env.POSTGRES_PORT,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
    },
    {
      name: "DB_*",
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    },
  ];

  for (const c of candidates) {
    const built = buildFromParts(c);
    if (built.ok) {
      const u = new URL(built.url);
      return { url: u.toString(), redacted: redact(u), source: c.name };
    }
  }

  // 3) Hard fail with actionable message
  const present = {
    DATABASE_URL: Boolean(raw),
    PGHOST: Boolean(process.env.PGHOST),
    PGPORT: Boolean(process.env.PGPORT),
    PGUSER: Boolean(process.env.PGUSER),
    PGPASSWORD: Boolean(process.env.PGPASSWORD),
    PGDATABASE: Boolean(process.env.PGDATABASE),
    POSTGRES_HOST: Boolean(process.env.POSTGRES_HOST),
    POSTGRES_PORT: Boolean(process.env.POSTGRES_PORT),
    POSTGRES_USER: Boolean(process.env.POSTGRES_USER),
    POSTGRES_PASSWORD: Boolean(process.env.POSTGRES_PASSWORD),
    POSTGRES_DB: Boolean(process.env.POSTGRES_DB),
    DB_HOST: Boolean(process.env.DB_HOST),
    DB_PORT: Boolean(process.env.DB_PORT),
    DB_USER: Boolean(process.env.DB_USER),
    DB_PASSWORD: Boolean(process.env.DB_PASSWORD),
    DB_NAME: Boolean(process.env.DB_NAME),
  };

  const example = "postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require";
  const msg =
    "[db] FATAL: No valid DATABASE_URL and cannot construct one from env parts. " +
    "Set DATABASE_URL in Railway OR set PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE. " +
    "Present=" +
    JSON.stringify(present) +
    " Example=" +
    example;

  const err = new Error(msg);
  err.code = "DB_URL_INVALID";
  throw err;
}

