import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({
  title: z.string().min(1),
  companyName: z.string().min(1),
  location: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  description: z.string().optional(),
  via: z.string().optional()
});

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const r = parsed.data;
  const company = await prisma.company.upsert({
    where: { userId_name: { userId, name: r.companyName } },
    create: { userId, name: r.companyName },
    update: {}
  });

  const externalId = createHash("sha1")
    .update([r.title, r.companyName, r.sourceUrl ?? ""].join("|"))
    .digest("hex")
    .slice(0, 24);

  const job = await prisma.job.upsert({
    where: {
      userId_source_externalId: { userId, source: "serpapi", externalId }
    },
    create: {
      userId,
      companyId: company.id,
      source: "serpapi",
      externalId,
      sourceUrl: r.sourceUrl,
      title: r.title,
      location: r.location,
      description: r.description
    },
    update: {
      companyId: company.id,
      sourceUrl: r.sourceUrl,
      title: r.title,
      location: r.location,
      description: r.description
    }
  });

  return NextResponse.json({ ok: true, jobId: job.id });
}

