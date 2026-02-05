import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { computeMatchScore } from "@/lib/matchScore";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId } = (await req.json().catch(() => ({}))) as { jobId?: string };

  const [profile, skills] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.skill.findMany({ where: { userId }, orderBy: { isCore: "desc" } })
  ]);

  const jobs = await prisma.job.findMany({
    where: { userId, ...(jobId ? { id: jobId } : {}) },
    select: { id: true, title: true, description: true, requirements: true, workMode: true }
  });

  let updated = 0;
  for (const job of jobs) {
    const r = computeMatchScore({ profile, skills, job });
    await prisma.job.update({
      where: { id: job.id },
      data: { matchScore: r.score, matchNotes: r.notes }
    });
    updated++;
  }

  return NextResponse.json({ updated });
}

