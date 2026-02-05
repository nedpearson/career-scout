import type { Express, Request, Response } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { spawn, type ChildProcess } from "node:child_process";

let child: ChildProcess | null = null;

function boolEnv(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return defaultValue;
  return raw.toLowerCase() === "true" || raw === "1" || raw.toLowerCase() === "yes";
}

function intEnv(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw) return defaultValue;
  const n = Number(raw);
  return Number.isFinite(n) ? n : defaultValue;
}

export function setupJobTrackerIntegration(app: Express) {
  const isProd = process.env.NODE_ENV === "production";

  // In dev we default enabled to make local testing easy.
  // In prod we default disabled to avoid surprising behavior until Railway vars are set.
  const enabled = boolEnv("JOBTRACKER_ENABLED", !isProd);
  const autostart = boolEnv("JOBTRACKER_AUTOSTART", enabled);
  const port = intEnv("JOBTRACKER_INTERNAL_PORT", 3001);
  const target = `http://127.0.0.1:${port}`;

  if (enabled && autostart) {
    startJobTracker({ port, isProd });
  }

  app.use(
    "/jobtracker",
    (req, res, next) => {
      if (!enabled) {
        res
          .status(404)
          .type("text/plain")
          .send("Job Tracker module is disabled. Set JOBTRACKER_ENABLED=true to enable it.");
        return;
      }
      next();
    },
    createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: true,
      // Preserve /jobtracker prefix (JobTracker is configured with basePath=/jobtracker)
      on: {
        error(err: unknown, _req: Request, res: Response | any) {
          console.error("[jobtracker-proxy] error", err);
          // `res` can be an Express response OR a raw socket depending on where the failure occurred.
          if (res?.status && typeof res.status === "function") {
            res.status(502).type("text/plain").send("Job Tracker is unavailable.");
            return;
          }
          if (res?.writeHead && typeof res.writeHead === "function") {
            res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("Job Tracker is unavailable.");
          }
        },
      },
    }),
  );
}

function startJobTracker(opts: { port: number; isProd: boolean }) {
  if (child) return;

  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const args = [
    "--prefix",
    "apps/jobtracker",
    "run",
    opts.isProd ? "start" : "dev",
  ];

  // For `next dev` we pass the port flag. For prod, JobTracker's start script reads PORT.
  if (!opts.isProd) {
    args.push("--", "-p", String(opts.port));
  }

  const env = {
    ...process.env,
    PORT: String(opts.port),
    // Map namespaced JobTracker vars to the unprefixed names JobTracker expects.
    DATABASE_URL: process.env.JOBTRACKER_DATABASE_URL ?? process.env.DATABASE_URL,
    AUTH_URL: process.env.JOBTRACKER_AUTH_URL ?? process.env.AUTH_URL,
    AUTH_SECRET: process.env.JOBTRACKER_AUTH_SECRET ?? process.env.AUTH_SECRET,
    AUTH_TRUST_HOST: process.env.JOBTRACKER_AUTH_TRUST_HOST ?? process.env.AUTH_TRUST_HOST,
    AUTH_GOOGLE_ID: process.env.JOBTRACKER_AUTH_GOOGLE_ID ?? process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.JOBTRACKER_AUTH_GOOGLE_SECRET ?? process.env.AUTH_GOOGLE_SECRET,
    OPENAI_API_KEY: process.env.JOBTRACKER_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.JOBTRACKER_OPENAI_MODEL ?? process.env.OPENAI_MODEL,
    SERPAPI_API_KEY: process.env.JOBTRACKER_SERPAPI_API_KEY ?? process.env.SERPAPI_API_KEY,
    ALLOW_DEV_LOGIN: process.env.JOBTRACKER_ALLOW_DEV_LOGIN ?? process.env.ALLOW_DEV_LOGIN,
    ALLOW_DEMO_LOGIN: process.env.JOBTRACKER_ALLOW_DEMO_LOGIN ?? process.env.ALLOW_DEMO_LOGIN,
  };

  child = spawn(npmCmd, args, {
    stdio: "inherit",
    env,
    shell: process.platform === "win32",
  });

  child.on("exit", (code, signal) => {
    console.warn("[jobtracker] exited", { code, signal });
    child = null;
  });
}

