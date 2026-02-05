import type { PrismaClient } from "@prisma/client";

const DEMO_EMAIL = "demo@jobtracker.app";

export async function getOrCreateDemoUser(prisma: PrismaClient) {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: "Demo User",
      rememberMe: true
      // passwordHash intentionally null (demo login bypasses password)
    }
  });
}

export async function ensureDemoSeed(prisma: PrismaClient, userId: string) {
  const existingJobs = await prisma.job.count({ where: { userId } });
  if (existingJobs > 0) return;

  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) {
    await prisma.profile.create({
      data: {
        userId,
        headline: "Senior Full‑Stack Engineer • Product-minded • Hiring-focused",
        summary:
          "I build modern web apps end-to-end (Next.js, TypeScript, Prisma). I ship fast, communicate clearly, and focus on outcomes."
      }
    });
  }

  const skillNames = ["TypeScript", "React", "Next.js", "Prisma", "SQL", "Node.js"];
  for (const name of skillNames) {
    await prisma.skill.upsert({
      where: { userId_name: { userId, name } },
      update: {},
      create: { userId, name, level: 4, isCore: true }
    });
  }

  const acme = await prisma.company.create({
    data: {
      userId,
      name: "Acme Analytics",
      website: "https://example.com",
      industry: "B2B SaaS",
      size: "51-200",
      notes: "Demo company: data products and dashboards."
    }
  });

  const nova = await prisma.company.create({
    data: {
      userId,
      name: "Nova Payments",
      website: "https://example.com",
      industry: "Fintech",
      size: "201-500",
      notes: "Demo company: payments infrastructure."
    }
  });

  const job1 = await prisma.job.create({
    data: {
      userId,
      companyId: acme.id,
      source: "demo",
      externalId: "acme-senior-fe",
      title: "Senior Frontend Engineer",
      location: "Remote",
      description: "Build dashboards and data visualizations in Next.js.",
      matchScore: 84,
      matchNotes: "Strong TS/React fit; highlight performance + UX."
    }
  });

  const job2 = await prisma.job.create({
    data: {
      userId,
      companyId: nova.id,
      source: "demo",
      externalId: "nova-fullstack",
      title: "Full‑Stack Engineer",
      location: "Hybrid",
      description: "Ship product features across web + API.",
      matchScore: 78,
      matchNotes: "Emphasize backend reliability + product sense."
    }
  });

  await prisma.application.create({
    data: {
      userId,
      jobId: job1.id,
      stage: "INTERESTED",
      notes: "Demo application. Try scoring, deep-dive, and outreach."
    }
  });

  await prisma.application.create({
    data: {
      userId,
      jobId: job2.id,
      stage: "APPLIED",
      appliedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      nextFollowUpAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      notes: "Demo application with follow-up scheduled."
    }
  });
}

