import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { addBusinessDays } from "@/lib/date";

export const runtime = "nodejs";

const schema = z.object({
  applicationId: z.string().min(1),
  stage: z
    .enum(["INTERESTED", "APPLIED", "RECRUITER_SCREEN", "INTERVIEW", "OFFER", "CLOSED"])
    .optional(),
  nextFollowUpAt: z.string().nullable().optional(), // YYYY-MM-DD or null
  appliedAt: z.string().nullable().optional(), // ISO string or null
  autoFollowUpBusinessDays: z.number().int().min(1).max(30).optional()
});

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { applicationId, stage, nextFollowUpAt, appliedAt, autoFollowUpBusinessDays } = parsed.data;

  const existing = await prisma.application.findFirst({
    where: { id: applicationId, userId },
    select: { id: true }
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: any = {};
  if (stage) data.stage = stage;
  if (nextFollowUpAt !== undefined) {
    data.nextFollowUpAt = nextFollowUpAt ? new Date(`${nextFollowUpAt}T09:00:00`) : null;
  }
  if (appliedAt !== undefined) {
    data.appliedAt = appliedAt ? new Date(appliedAt) : null;
  }
  if (autoFollowUpBusinessDays !== undefined) {
    data.nextFollowUpAt = addBusinessDays(new Date(), autoFollowUpBusinessDays);
  }

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data,
    select: { id: true, stage: true, nextFollowUpAt: true, appliedAt: true }
  });

  return NextResponse.json({
    ok: true,
    applicationId: updated.id,
    stage: updated.stage,
    nextFollowUpAt: updated.nextFollowUpAt?.toISOString() ?? null,
    appliedAt: updated.appliedAt?.toISOString() ?? null
  });
}

