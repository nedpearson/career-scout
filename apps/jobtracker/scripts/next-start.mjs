import { spawn } from "node:child_process";
import { getDatabaseUrlOrThrow } from "./db-url.mjs";

// Startup preflight: validate/construct DATABASE_URL for the running Next.js server.
let urlInfo;
try {
  urlInfo = getDatabaseUrlOrThrow();
} catch (e) {
  console.error(e?.message || String(e));
  process.exit(1);
}

process.env.DATABASE_URL = urlInfo.url;
console.log(`[db] DATABASE_URL ok: ${JSON.stringify({ source: urlInfo.source, ...urlInfo.redacted })}`);

// Railway (and many PaaS providers) set PORT (often 8080). Next.js won't always
// pick it up automatically depending on invocation, so we pass it explicitly.
const port = process.env.PORT || "3000";
const args = ["node_modules/next/dist/bin/next", "start", "-p", port];

const child = spawn(process.execPath, args, {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: urlInfo.url }
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});

