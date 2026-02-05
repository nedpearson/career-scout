import { spawn } from "node:child_process";
import path from "node:path";
import { getDatabaseUrlOrThrow } from "./db-url.mjs";

// Railway (and some log aggregators) treat stderr as "error" logs.
// Prisma sometimes writes non-error status lines to stderr, so we pipe stderr -> stdout.

const bin = process.platform === "win32" ? "prisma.cmd" : "prisma";
const prismaBin = path.join(process.cwd(), "node_modules", ".bin", bin);

let urlInfo;
try {
  urlInfo = getDatabaseUrlOrThrow();
} catch (e) {
  console.error(e?.message || String(e));
  process.exit(1);
}

process.env.DATABASE_URL = urlInfo.url;
console.log(`[db] DATABASE_URL ok: ${JSON.stringify({ source: urlInfo.source, ...urlInfo.redacted })}`);

const child = spawn(prismaBin, ["migrate", "deploy"], {
  env: { ...process.env, DATABASE_URL: urlInfo.url },
  stdio: ["inherit", "inherit", "pipe"],
  // Required to execute `.cmd` shims on Windows.
  shell: process.platform === "win32",
});

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

