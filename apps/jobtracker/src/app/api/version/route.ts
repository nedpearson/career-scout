import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pickEnv(...keys: string[]) {
  for (const k of keys) {
    const v = process.env[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

export async function GET() {
  const sha =
    pickEnv(
      "RAILWAY_GIT_COMMIT_SHA",
      "RAILWAY_GIT_COMMIT",
      "GIT_COMMIT_SHA",
      "VERCEL_GIT_COMMIT_SHA",
      "SOURCE_VERSION"
    ) || "unknown";

  const ref = pickEnv("RAILWAY_GIT_BRANCH", "GIT_BRANCH", "VERCEL_GIT_COMMIT_REF") || "unknown";

  return NextResponse.json({
    name: "JobTracker",
    version: process.env.npm_package_version ?? "unknown",
    sha,
    ref,
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    runtime,
    now: new Date().toISOString()
  });
}

