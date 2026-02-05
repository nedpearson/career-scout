import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Minimal `.env` loader (no external deps).
 *
 * - Loads variables from project-root `.env.local` then `.env` (if present)
 * - Does **not** override existing `process.env` keys
 * - Supports simple `KEY=VALUE` lines with optional single/double quotes
 *
 * This is primarily to make `npm run start` / deployments that rely on a `.env`
 * file behave consistently, since Node does not load `.env` automatically.
 */
export function loadDotEnvFile(dotEnvPath = ".env") {
  try {
    const abs = resolve(process.cwd(), dotEnvPath);
    if (!existsSync(abs)) return;

    const raw = readFileSync(abs, "utf8");
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

      // Strip optional quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      // Basic escape handling for double-quoted values
      value = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t");

      process.env[key] = value;
    }
  } catch {
    // Best-effort only. If `.env` is malformed or unreadable, continue.
  }
}

// Load once on import.
// Priority: `.env.local` (developer machine) then `.env` (shared).
loadDotEnvFile(".env.local");
loadDotEnvFile(".env");

