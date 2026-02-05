import net from "node:net";
import fs from "node:fs";
import path from "node:path";

function loadDotEnvFile(filename) {
  const abs = path.resolve(process.cwd(), filename);
  if (!fs.existsSync(abs)) return;
  const raw = fs.readFileSync(abs, "utf8");
  for (const originalLine of raw.split(/\r?\n/)) {
    const line = originalLine.trim();
    if (!line || line.startsWith("#")) continue;
    const normalized = line.startsWith("export ") ? line.slice(7).trim() : line;
    const eqIdx = normalized.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = normalized.slice(0, eqIdx).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (process.env[key] !== undefined) continue;
    let value = normalized.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    value = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t");
    process.env[key] = value;
  }
}

// Priority: local overrides then shared defaults.
loadDotEnvFile(".env.local");
loadDotEnvFile(".env");

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("[wait-for-postgres] DATABASE_URL is not set (.env.local recommended).");
  process.exit(1);
}

let host;
let port;
try {
  const u = new URL(url);
  host = u.hostname;
  port = Number(u.port || "5432");
} catch {
  console.error("[wait-for-postgres] DATABASE_URL is not a valid URL.");
  process.exit(1);
}

const deadlineMs = Date.now() + 60_000;

function tryConnectOnce() {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    socket.setTimeout(3000);
    socket.on("connect", () => {
      socket.end();
      resolve();
    });
    socket.on("timeout", () => {
      socket.destroy(new Error("timeout"));
    });
    socket.on("error", (err) => reject(err));
  });
}

let attempt = 0;
// eslint-disable-next-line no-constant-condition
while (true) {
  attempt += 1;
  try {
    await tryConnectOnce();
    console.log(`[wait-for-postgres] Connected to ${host}:${port}`);
    process.exit(0);
  } catch (e) {
    if (Date.now() > deadlineMs) {
      console.error(`[wait-for-postgres] Timed out waiting for ${host}:${port}`);
      process.exit(1);
    }
    const backoff = Math.min(2000, 200 + attempt * 150);
    await new Promise((r) => setTimeout(r, backoff));
  }
}

