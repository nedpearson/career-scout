import { spawn } from "node:child_process";

function shouldRunDbPush() {
  const v = (process.env.CAREER_SCOUT_DB_PUSH_ON_START ?? "").toLowerCase().trim();
  return v === "true" || v === "1" || v === "yes";
}

if (!shouldRunDbPush()) {
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error("[prestart] CAREER_SCOUT_DB_PUSH_ON_START is enabled but DATABASE_URL is missing.");
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

