import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { searchJobsViaSerpApi } from "@/lib/jobSources/serpapi";

export const runtime = "nodejs";

const schema = z.object({
  query: z.string().min(2),
  location: z.string().optional()
});

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    const results = await searchJobsViaSerpApi(parsed.data);
    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Search failed" },
      { status: 400 }
    );
  }
}

