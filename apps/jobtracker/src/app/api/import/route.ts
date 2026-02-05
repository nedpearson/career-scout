import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({
  version: z.number().optional(),
  profile: z.any().optional(),
  skills: z.array(z.any()).optional(),
  companies: z.array(z.any()).optional(),
  jobs: z.array(z.any()).optional(),
  applications: z.array(z.any()).optional(),
  outreach: z.array(z.any()).optional()
});

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !parsed.data) {
    return NextResponse.json({ error: "Invalid JSON export format" }, { status: 400 });
  }

  const data = parsed.data;

  // Profile
  if (data.profile) {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, ...pickProfile(data.profile) },
      update: pickProfile(data.profile)
    });
  }

  // Skills
  const skills = data.skills ?? [];
  for (const s of skills) {
    if (!s?.name) continue;
    await prisma.skill.upsert({
      where: { userId_name: { userId, name: String(s.name) } },
      create: {
        userId,
        name: String(s.name),
        level: Number(s.level ?? 3),
        years: s.years != null ? Number(s.years) : null,
        isCore: Boolean(s.isCore)
      },
      update: {
        level: Number(s.level ?? 3),
        years: s.years != null ? Number(s.years) : null,
        isCore: Boolean(s.isCore)
      }
    });
  }

  // Companies (keep mapping by name)
  const companiesByName = new Map<string, string>();
  const companies = data.companies ?? [];
  for (const c of companies) {
    const name = String(c?.name ?? "").trim();
    if (!name) continue;
    const saved = await prisma.company.upsert({
      where: { userId_name: { userId, name } },
      create: {
        userId,
        name,
        website: c.website ?? null,
        location: c.location ?? null,
        industry: c.industry ?? null,
        size: c.size ?? null,
        notes: c.notes ?? null,
        aiSummary: c.aiSummary ?? null,
        aiHowToHelp: c.aiHowToHelp ?? null
      },
      update: {
        website: c.website ?? null,
        location: c.location ?? null,
        industry: c.industry ?? null,
        size: c.size ?? null,
        notes: c.notes ?? null,
        aiSummary: c.aiSummary ?? null,
        aiHowToHelp: c.aiHowToHelp ?? null
      }
    });
    companiesByName.set(name, saved.id);
  }

  // Jobs (best-effort merge using unique key when possible)
  const jobsByOldId = new Map<string, string>();
  const jobs = data.jobs ?? [];
  let importedJobs = 0;
  for (const j of jobs) {
    if (!j?.title) continue;
    const source = j.source ?? null;
    const externalId = j.externalId ?? null;
    const companyName = j.company?.name ?? null;
    const companyId = companyName ? companiesByName.get(String(companyName)) : undefined;

    if (source && externalId) {
      const saved = await prisma.job.upsert({
        where: { userId_source_externalId: { userId, source, externalId } },
        create: {
          userId,
          companyId,
          source,
          externalId,
          sourceUrl: j.sourceUrl ?? null,
          title: j.title,
          location: j.location ?? null,
          workMode: j.workMode ?? null,
          salaryMinUsd: j.salaryMinUsd ?? null,
          salaryMaxUsd: j.salaryMaxUsd ?? null,
          seniority: j.seniority ?? null,
          employmentType: j.employmentType ?? null,
          description: j.description ?? null,
          requirements: j.requirements ?? null,
          matchScore: j.matchScore ?? null,
          matchNotes: j.matchNotes ?? null
        },
        update: {
          companyId,
          sourceUrl: j.sourceUrl ?? null,
          title: j.title,
          location: j.location ?? null,
          workMode: j.workMode ?? null,
          salaryMinUsd: j.salaryMinUsd ?? null,
          salaryMaxUsd: j.salaryMaxUsd ?? null,
          seniority: j.seniority ?? null,
          employmentType: j.employmentType ?? null,
          description: j.description ?? null,
          requirements: j.requirements ?? null,
          matchScore: j.matchScore ?? null,
          matchNotes: j.matchNotes ?? null
        }
      });
      if (j.id) jobsByOldId.set(String(j.id), saved.id);
      importedJobs++;
    } else {
      const saved = await prisma.job.create({
        data: {
          userId,
          companyId,
          source: source ?? undefined,
          externalId: externalId ?? undefined,
          sourceUrl: j.sourceUrl ?? null,
          title: j.title,
          location: j.location ?? null,
          workMode: j.workMode ?? null,
          salaryMinUsd: j.salaryMinUsd ?? null,
          salaryMaxUsd: j.salaryMaxUsd ?? null,
          seniority: j.seniority ?? null,
          employmentType: j.employmentType ?? null,
          description: j.description ?? null,
          requirements: j.requirements ?? null,
          matchScore: j.matchScore ?? null,
          matchNotes: j.matchNotes ?? null
        }
      });
      if (j.id) jobsByOldId.set(String(j.id), saved.id);
      importedJobs++;
    }
  }

  // Applications (mapped by old jobId if available)
  const applicationsByOldId = new Map<string, string>();
  const applications = data.applications ?? [];
  let importedApplications = 0;
  for (const a of applications) {
    const oldJobId = a?.jobId ? String(a.jobId) : "";
    const newJobId = jobsByOldId.get(oldJobId);
    if (!newJobId) continue;

    const saved = await prisma.application.create({
      data: {
        userId,
        jobId: newJobId,
        stage: a.stage ?? "INTERESTED",
        appliedAt: a.appliedAt ? new Date(a.appliedAt) : null,
        nextFollowUpAt: a.nextFollowUpAt ? new Date(a.nextFollowUpAt) : null,
        contactName: a.contactName ?? null,
        contactEmail: a.contactEmail ?? null,
        notes: a.notes ?? null
      }
    });
    if (a.id) applicationsByOldId.set(String(a.id), saved.id);
    importedApplications++;
  }

  // Outreach (mapped by old applicationId if available)
  const outreach = data.outreach ?? [];
  let importedOutreach = 0;
  for (const o of outreach) {
    const oldAppId = o?.applicationId ? String(o.applicationId) : "";
    const newAppId = applicationsByOldId.get(oldAppId);
    await prisma.outreachEmail.create({
      data: {
        userId,
        applicationId: newAppId ?? null,
        toEmail: o.toEmail ?? null,
        ccEmail: o.ccEmail ?? null,
        subject: o.subject ?? "(imported)",
        bodyText: o.bodyText ?? "",
        tone: o.tone ?? "NEUTRAL",
        humanLevel: typeof o.humanLevel === "number" ? o.humanLevel : 70,
        sentAt: o.sentAt ? new Date(o.sentAt) : null,
        gmailMessageId: o.gmailMessageId ?? null
      }
    });
    importedOutreach++;
  }

  return NextResponse.json({ ok: true, importedJobs, importedApplications, importedOutreach });
}

function pickProfile(p: any) {
  return {
    headline: p.headline ?? null,
    summary: p.summary ?? null,
    location: p.location ?? null,
    desiredTitles: p.desiredTitles ?? null,
    desiredWorkModes: p.desiredWorkModes ?? null,
    minSalaryUsd: p.minSalaryUsd ?? null,
    maxSalaryUsd: p.maxSalaryUsd ?? null,
    resumeText: p.resumeText ?? null
  };
}

