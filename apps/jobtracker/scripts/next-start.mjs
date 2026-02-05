import { spawn } from "node:child_process";

// Railway (and many PaaS providers) set PORT (often 8080). Next.js won't always
// pick it up automatically depending on invocation, so we pass it explicitly.
const port = process.env.PORT || "3000";
const args = ["node_modules/next/dist/bin/next", "start", "-p", port];

const child = spawn(process.execPath, args, {
  stdio: "inherit",
  env: process.env
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});

