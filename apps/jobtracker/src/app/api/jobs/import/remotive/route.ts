import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { fetchRemotiveJobs } from "@/lib/jobSources/remotive";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { search } = (await req.json().catch(() => ({}))) as { search?: string };
  const jobs = await fetchRemotiveJobs({ search });

  let upserted = 0;
  for (const job of jobs) {
    const company = await prisma.company.upsert({
      where: { userId_name: { userId, name: job.companyName } },
      create: { userId, name: job.companyName },
      update: {}
    });

    await prisma.job.upsert({
      where: {
        userId_source_externalId: { userId, source: job.source, externalId: job.externalId }
      },
      create: {
        userId,
        companyId: company.id,
        source: job.source,
        externalId: job.externalId,
        sourceUrl: job.sourceUrl,
        title: job.title,
        location: job.location,
        workMode: job.workMode,
        employmentType: job.employmentType,
        description: job.description
      },
      update: {
        companyId: company.id,
        sourceUrl: job.sourceUrl,
        title: job.title,
        location: job.location,
        workMode: job.workMode,
        employmentType: job.employmentType,
        description: job.description
      }
    });
    upserted++;
  }

  return NextResponse.json({ imported: jobs.length, upserted });
}

