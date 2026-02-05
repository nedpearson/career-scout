import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { addBusinessDays } from "@/lib/date";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | {
        jobId?: string;
        stage?: string;
        appliedAt?: string;
        autoFollowUpBusinessDays?: number;
      }
    | null;

  const jobId = body?.jobId;
  if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

  const existing = await prisma.application.findFirst({
    where: { userId, jobId },
    select: { id: true }
  });
  if (existing) {
    const data: any = {};
    if (body?.stage) data.stage = body.stage;
    if (body?.appliedAt) data.appliedAt = new Date(body.appliedAt);
    if (typeof body?.autoFollowUpBusinessDays === "number") {
      const days = Math.max(1, Math.min(30, Math.floor(body.autoFollowUpBusinessDays)));
      data.nextFollowUpAt = addBusinessDays(new Date(), days);
    }
    if (Object.keys(data).length) {
      await prisma.application.update({ where: { id: existing.id }, data });
    }
    return NextResponse.json({ ok: true, applicationId: existing.id, created: false });
  }

  const created = await prisma.application.create({
    data: {
      userId,
      jobId,
      stage: (body?.stage as any) ?? "INTERESTED",
      appliedAt: body?.appliedAt ? new Date(body.appliedAt) : undefined,
      nextFollowUpAt:
        typeof body?.autoFollowUpBusinessDays === "number"
          ? addBusinessDays(new Date(), Math.max(1, Math.min(30, Math.floor(body.autoFollowUpBusinessDays))))
          : undefined
    },
    select: { id: true }
  });

  return NextResponse.json({ ok: true, applicationId: created.id, created: true });
}

