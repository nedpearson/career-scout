import type { Request, Response, NextFunction } from "express";

type HitEntry = {
  timestamps: number[];
};

const WINDOW_MS = 5000;           // 5 seconds
const MAX_HITS_PER_KEY = 25;      // suspicious threshold
const CLEANUP_INTERVAL_MS = 60_000;

const hits: Map<string, HitEntry> = new Map();

// Periodic cleanup to keep memory bounded
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  Array.from(hits.entries()).forEach(([key, entry]) => {
    entry.timestamps = entry.timestamps.filter(
      (ts: number) => now - ts <= WINDOW_MS
    );
    if (entry.timestamps.length === 0) {
      hits.delete(key);
    }
  });
}, CLEANUP_INTERVAL_MS);

// Ensure process can exit if this is the only thing running
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

export function loopWatchdogMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const ip = (req.headers["x-forwarded-for"] as string) || req.ip || "unknown";
  const path = req.path || req.originalUrl || "/";
  const key = `${ip}:${path}`;

  const now = Date.now();
  let entry = hits.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    hits.set(key, entry);
  }

  // Maintain sliding window
  entry.timestamps.push(now);
  entry.timestamps = entry.timestamps.filter((ts: number) => now - ts <= WINDOW_MS);

  if (entry.timestamps.length > MAX_HITS_PER_KEY) {
    const info = {
      type: "BACKEND_REQUEST_LOOP_SUSPECTED",
      ip,
      path,
      hitsInWindow: entry.timestamps.length,
      windowMs: WINDOW_MS,
      userAgent: req.headers["user-agent"],
      timestamp: new Date().toISOString(),
    };

    console.warn("[LoopWatchdogMiddleware]", info);
    res.setHeader("X-Loop-Watchdog", "suspected");
  }

  return next();
}
