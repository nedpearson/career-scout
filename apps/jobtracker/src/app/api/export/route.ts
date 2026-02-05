import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [profile, skills, companies, jobs, applications, outreach] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.skill.findMany({ where: { userId } }),
    prisma.company.findMany({ where: { userId } }),
    prisma.job.findMany({ where: { userId } }),
    prisma.application.findMany({ where: { userId } }),
    prisma.outreachEmail.findMany({ where: { userId } })
  ]);

  // Never export auth tokens (Account/Session).
  return NextResponse.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    profile,
    skills,
    companies,
    jobs,
    applications,
    outreach
  });
}

