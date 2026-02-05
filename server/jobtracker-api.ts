import type { Express, NextFunction, Request, Response } from "express";
import express from "express";
import { z } from "zod";
import { prisma } from "./prisma";
import { addBusinessDays } from "date-fns";
import { createHash } from "crypto";
import OpenAI from "openai";
import type { WorkMode } from "@prisma/client";
import { db as legacyDb } from "./db";
import { applications as legacyApplications, contacts as legacyContacts, jobs as legacyJobs } from "@shared/schema";
import { eq } from "drizzle-orm";

function pickEnv(...keys: string[]) {
  for (const k of keys) {
    const v = process.env[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function safeJson(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function jobtrackerEnv() {
  return {
    OPENAI_API_KEY:
      process.env.JOBTRACKER_OPENAI_API_KEY?.trim() ||
      process.env.AI_INTEGRATIONS_OPENAI_API_KEY?.trim() ||
      process.env.OPENAI_API_KEY?.trim() ||
      "",
    OPENAI_MODEL:
      process.env.JOBTRACKER_OPENAI_MODEL?.trim() ||
      process.env.OPENAI_MODEL?.trim() ||
      "gpt-4o-mini",
    SERPAPI_API_KEY:
      process.env.JOBTRACKER_SERPAPI_API_KEY?.trim() ||
      process.env.SERPAPI_API_KEY?.trim() ||
      "",
    AUTH_GOOGLE_ID:
      process.env.JOBTRACKER_AUTH_GOOGLE_ID?.trim() ||
      process.env.AUTH_GOOGLE_ID?.trim() ||
      "",
    AUTH_GOOGLE_SECRET:
      process.env.JOBTRACKER_AUTH_GOOGLE_SECRET?.trim() ||
      process.env.AUTH_GOOGLE_SECRET?.trim() ||
      "",
  };
}

let cachedOpenAI: OpenAI | null | undefined;
function getJobtrackerOpenAIClient(): OpenAI | null {
  if (cachedOpenAI !== undefined) return cachedOpenAI;
  const { OPENAI_API_KEY } = jobtrackerEnv();
  cachedOpenAI = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;
  return cachedOpenAI;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated?.() && req.user) return next();
  res.status(401).json({ error: "Unauthorized" });
}

function getUserId(req: Request): string {
  const id = (req.user as any)?.id;
  return typeof id === "string" ? id : String(id ?? "");
}

async function searchJobsViaSerpApi({
  query,
  location,
}: {
  query: string;
  location?: string;
}) {
  const { SERPAPI_API_KEY } = jobtrackerEnv();
  if (!SERPAPI_API_KEY) throw new Error("SERPAPI_API_KEY not set");

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_jobs");
  url.searchParams.set("q", query);
  if (location) url.searchParams.set("location", location);
  url.searchParams.set("api_key", SERPAPI_API_KEY);

  const res = await fetch(url.toString(), { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`SerpAPI failed: ${res.status}`);
  const json = (await res.json()) as any;
  return (json.jobs_results ?? []) as any[];
}

type NormalizedJob = {
  source: string;
  externalId: string;
  sourceUrl: string;
  title: string;
  companyName: string;
  location?: string;
  workMode?: WorkMode;
  employmentType?: string;
  description?: string;
};

async function fetchRemotiveJobs({ search }: { search?: string }): Promise<NormalizedJob[]> {
  const url = new URL("https://remotive.com/api/remote-jobs");
  if (search) url.searchParams.set("search", search);
  const res = await fetch(url.toString(), { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Remotive fetch failed: ${res.status}`);
  const data = (await res.json()) as any;
  const jobs = (data?.jobs ?? []) as any[];
  return jobs.map((j) => ({
    source: "remotive",
    externalId: String(j.id),
    sourceUrl: String(j.url),
    title: String(j.title),
    companyName: String(j.company_name),
    location: String(j.candidate_required_location ?? "Remote"),
    workMode: "REMOTE" as WorkMode,
    employmentType: j.job_type ?? undefined,
    description: j.description ?? undefined,
  }));
}

function normalizeText(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9+.#\s-]/g, " ");
}
function includesPhrase(haystack: string, phrase: string) {
  return normalizeText(haystack).includes(normalizeText(phrase).trim());
}

function computeMatchScore({
  profile,
  skills,
  job,
}: {
  profile: any | null;
  skills: Array<{ name: string; isCore?: boolean | null; level?: number | null }>;
  job: { title: string; description?: string | null; requirements?: string | null; workMode?: WorkMode | null };
}): { score: number; matchedSkills: string[]; notes: string } {
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
  const parseCsv = (s?: string | null): string[] =>
    (s ?? "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  const workModeBonus = () => {
    const desired = new Set(parseCsv(profile?.desiredWorkModes).map((x) => x.toUpperCase()));
    if (!profile || !job.workMode || desired.size === 0) return 0;
    return desired.has(String(job.workMode).toUpperCase()) ? 1 : 0;
  };

  const titleBonus = () => {
    const desiredTitles = parseCsv(profile?.desiredTitles);
    if (!profile || desiredTitles.length === 0) return 0;
    const jt = job.title.toLowerCase();
    return desiredTitles.some((t) => jt.includes(t.toLowerCase())) ? 1 : 0;
  };

  const jobText = `${job.title}\n${job.requirements ?? ""}\n${job.description ?? ""}`.trim();

  const skillNames = skills
    .map((s) => String(s.name ?? "").trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  const matched: string[] = [];
  for (const name of skillNames) {
    if (includesPhrase(jobText, name)) matched.push(name);
  }

  const skillCoverage = skillNames.length === 0 ? 0 : matched.length / skillNames.length;
  const score = 65 * clamp(skillCoverage, 0, 1) + 20 * titleBonus() + 15 * workModeBonus();

  const notesParts: string[] = [];
  if (matched.length > 0) notesParts.push(`Matched skills: ${matched.slice(0, 12).join(", ")}.`);
  if (skillNames.length === 0) notesParts.push("Add skills in Profile to improve scoring.");
  if (titleBonus()) notesParts.push("Title aligns with your target titles.");
  if (workModeBonus()) notesParts.push("Work mode matches your preference.");

  return { score: Math.round(clamp(score, 0, 100)), matchedSkills: matched, notes: notesParts.join(" ") };
}

async function sendGmailMessage(opts: {
  googleClientId: string;
  googleClientSecret: string;
  refreshToken: string;
  accessToken?: string | null;
  to: string;
  cc?: string | null;
  subject: string;
  bodyText: string;
}): Promise<{ id: string }> {
  const { google } = (await import("googleapis")) as any;

  const base64UrlEncode = (input: Buffer | string) => {
    const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
    return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  };

  const oauth2 = new google.auth.OAuth2({
    clientId: opts.googleClientId,
    clientSecret: opts.googleClientSecret,
  });
  oauth2.setCredentials({
    access_token: opts.accessToken ?? undefined,
    refresh_token: opts.refreshToken,
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2 });
  const headers = [
    `To: ${opts.to}`,
    opts.cc ? `Cc: ${opts.cc}` : "",
    `Subject: ${opts.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
  ]
    .filter(Boolean)
    .join("\r\n");

  const raw = `${headers}\r\n\r\n${opts.bodyText}\r\n`;
  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: base64UrlEncode(raw) },
  });
  const id = res?.data?.id;
  if (!id) throw new Error("Gmail send failed (no message id returned)");
  return { id };
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
    resumeText: p.resumeText ?? null,
  };
}

export function registerJobtrackerApi(app: Express) {
  const router = express.Router();

  router.get("/version", (_req, res) => {
    const sha =
      pickEnv(
        "RAILWAY_GIT_COMMIT_SHA",
        "RAILWAY_GIT_COMMIT",
        "GIT_COMMIT_SHA",
        "VERCEL_GIT_COMMIT_SHA",
        "SOURCE_VERSION",
      ) || "unknown";
    const ref = pickEnv("RAILWAY_GIT_BRANCH", "GIT_BRANCH", "VERCEL_GIT_COMMIT_REF") || "unknown";
    res.json({
      name: "JobTracker",
      version: process.env.npm_package_version ?? "unknown",
      sha,
      ref,
      nodeEnv: process.env.NODE_ENV ?? "unknown",
      runtime: "nodejs",
      now: new Date().toISOString(),
    });
  });

  // Basic read/write endpoints for the SPA (JobTracker Next.js used server components instead of APIs).
  router.get("/jobs", requireAuth, async (req, res, next) => {
    try {
      const userId = getUserId(req);
      const querySchema = z.object({
        q: z.string().optional(),
        take: z.coerce.number().int().min(1).max(200).optional(),
        skip: z.coerce.number().int().min(0).max(5000).optional(),
      });
      const parsed = querySchema.safeParse(req.query);
      if (!parsed.success) return res.status(400).json({ error: "Invalid query" });
      const { q, take = 50, skip = 0 } = parsed.data;

      const jobs = await prisma.job.findMany({
        where: {
          userId,
          ...(q
            ? {
                OR: [
                  { title: { contains: q, mode: "insensitive" } },
                  { company: { name: { contains: q, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
        include: { company: true, applications: { select: { id: true, stage: true } } },
        orderBy: { updatedAt: "desc" },
        take,
        skip,
      });

      res.json({ ok: true, jobs });
    } catch (e) {
      next(e);
    }
  });

  router.get("/applications", requireAuth, async (req, res, next) => {
    try {
      const userId = getUserId(req);
      const apps = await prisma.application.findMany({
        where: { userId },
        include: {
          job: { include: { company: true } },
          outreach: { orderBy: { createdAt: "desc" }, take: 5 },
          contacts: { include: { contact: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 200,
      });
      res.json({ ok: true, applications: apps });
    } catch (e) {
      next(e);
    }
  });

  router.get("/contacts", requireAuth, async (req, res, next) => {
    try {
      const userId = getUserId(req);
      const querySchema = z.object({
        q: z.string().optional(),
        take: z.coerce.number().int().min(1).max(500).optional(),
      });
      const parsed = querySchema.safeParse(req.query);
      if (!parsed.success) return res.status(400).json({ error: "Invalid query" });
      const { q, take = 200 } = parsed.data;

      const contacts = await prisma.contact.findMany({
        where: {
          userId,
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { company: { contains: q, mode: "insensitive" } },
                  { email: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: [{ hiringSignal: "desc" }, { updatedAt: "desc" }],
        take,
      });
      res.json({ ok: true, contacts });
    } catch (e) {
      next(e);
    }
  });

  router.get("/profile", requireAuth, async (req, res, next) => {
    try {
      const userId = getUserId(req);
      const [profile, skills] = await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        prisma.skill.findMany({ where: { userId }, orderBy: [{ isCore: "desc" }, { level: "desc" }, { name: "asc" }] }),
      ]);
      res.json({ ok: true, profile, skills });
    } catch (e) {
      next(e);
    }
  });

  router.put("/profile", requireAuth, async (req, res, next) => {
    try {
      const userId = getUserId(req);
      const schema = z.object({
        headline: z.string().trim().max(200).optional().nullable(),
        summary: z.string().trim().max(8000).optional().nullable(),
        location: z.string().trim().max(200).optional().nullable(),
        linkedinUrl: z.string().trim().url().optional().nullable(),
        desiredTitles: z.string().trim().max(2000).optional().nullable(),
        desiredWorkModes: z.string().trim().max(2000).optional().nullable(),
        minSalaryUsd: z.number().int().min(0).max(2_000_000).optional().nullable(),
        maxSalaryUsd: z.number().int().min(0).max(2_000_000).optional().nullable(),
        resumeText: z.string().trim().max(200_000).optional().nullable(),
      });
      const parsed = schema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: "Invalid request" });

      const profile = await prisma.profile.upsert({
        where: { userId },
        create: { userId, ...parsed.data },
        update: parsed.data,
      });
      res.json({ ok: true, profile });
    } catch (e) {
      next(e);
    }
  });

  router.post("/skills", requireAuth, async (req, res, next) => {
    try {
      const userId = getUserId(req);
      const schema = z.object({
        name: z.string().trim().min(1).max(80),
        level: z.number().int().min(1).max(5).optional(),
        years: z.number().min(0).max(60).optional().nullable(),
        isCore: z.boolean().optional(),
      });
      const parsed = schema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: "Invalid request" });

      const s = await prisma.skill.upsert({
        where: { userId_name: { userId, name: parsed.data.name } },
        create: {
          userId,
          name: parsed.data.name,
          level: parsed.data.level ?? 3,
          years: parsed.data.years ?? null,
          isCore: parsed.data.isCore ?? false,
        },
        update: {
          level: parsed.data.level ?? 3,
          years: parsed.data.years ?? null,
          isCore: parsed.data.isCore ?? false,
        },
      });

      res.status(201).json({ ok: true, skill: s });
    } catch (e) {
      next(e);
    }
  });

  router.delete("/skills/:id", requireAuth, async (req, res, next) => {
    try {
      const userId = getUserId(req);
      const id = String(req.params.id || "");
      if (!id) return res.status(400).json({ error: "Missing id" });
      await prisma.skill.deleteMany({ where: { id, userId } });
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  });

  // One-time migration: Drizzle/public Career Scout tables -> Prisma/jobtracker schema
  router.post("/migrate/legacy", requireAuth, async (req, res, next) => {
    try {
      const userId = getUserId(req);

      const [ljobs, lapps, lcontacts] = await Promise.all([
        legacyDb.select().from(legacyJobs).where(eq(legacyJobs.userId, userId)),
        legacyDb.select().from(legacyApplications).where(eq(legacyApplications.userId, userId)),
        legacyDb.select().from(legacyContacts).where(eq(legacyContacts.userId, userId)),
      ]);

      const companyIdByName = new Map<string, string>();
      const jobIdByLegacyId = new Map<number, string>();

      let migratedJobs = 0;
      for (const j of ljobs as any[]) {
        const companyName = String(j.company ?? "").trim() || "Unknown";
        const companyId =
          companyIdByName.get(companyName) ??
          (
            await prisma.company.upsert({
              where: { userId_name: { userId, name: companyName } },
              create: { userId, name: companyName },
              update: {},
              select: { id: true },
            })
          ).id;
        companyIdByName.set(companyName, companyId);

        const externalId = String(j.id);
        const legacyMetaParts = [
          j.priority ? `priority=${j.priority}` : "",
          j.salary ? `salary=${j.salary}` : "",
          j.resumeVersion ? `resumeVersion=${j.resumeVersion}` : "",
          j.contactName ? `contactName=${j.contactName}` : "",
          j.contactEmail ? `contactEmail=${j.contactEmail}` : "",
          j.contactPhone ? `contactPhone=${j.contactPhone}` : "",
          j.contactLinkedIn ? `contactLinkedIn=${j.contactLinkedIn}` : "",
        ].filter(Boolean);
        const legacyMeta = legacyMetaParts.length ? `\n\n[migrated from Career Scout: ${legacyMetaParts.join(", ")}]` : "\n\n[migrated from Career Scout]";

        const saved = await prisma.job.upsert({
          where: { userId_source_externalId: { userId, source: "careerscout", externalId } },
          create: {
            userId,
            companyId,
            source: "careerscout",
            externalId,
            sourceUrl: j.sourceUrl ?? null,
            title: String(j.title ?? "Untitled"),
            location: j.location ?? null,
            description: j.description ?? null,
            requirements: j.requirements ?? null,
            matchScore: typeof j.matchScore === "number" ? j.matchScore : null,
            matchNotes: (j.notes ?? "") + legacyMeta,
            createdAt: j.discoveredAt ?? undefined,
          },
          update: {
            companyId,
            sourceUrl: j.sourceUrl ?? null,
            title: String(j.title ?? "Untitled"),
            location: j.location ?? null,
            description: j.description ?? null,
            requirements: j.requirements ?? null,
            matchScore: typeof j.matchScore === "number" ? j.matchScore : null,
            matchNotes: (j.notes ?? "") + legacyMeta,
          },
          select: { id: true },
        });

        jobIdByLegacyId.set(Number(j.id), saved.id);
        migratedJobs++;
      }

      const mapStage = (status: string | null | undefined) => {
        const s = String(status ?? "").toLowerCase();
        if (s === "applied") return "APPLIED";
        if (s === "interviewing") return "INTERVIEW";
        if (s === "offered") return "OFFER";
        if (s === "rejected" || s === "withdrawn") return "CLOSED";
        return "INTERESTED";
      };

      let migratedApplications = 0;
      for (const a of lapps as any[]) {
        const legacyJobId = Number(a.jobId);
        const newJobId = jobIdByLegacyId.get(legacyJobId);
        if (!newJobId) continue;

        const existing = await prisma.application.findFirst({ where: { userId, jobId: newJobId }, select: { id: true } });
        const data: any = {
          stage: mapStage(a.status),
          appliedAt: a.appliedAt ?? null,
          nextFollowUpAt: a.followUpDate ?? null,
          notes: (a.notes ?? "") + "\n\n[migrated from Career Scout]",
        };

        if (existing) {
          await prisma.application.update({ where: { id: existing.id }, data });
        } else {
          await prisma.application.create({
            data: {
              userId,
              jobId: newJobId,
              ...data,
            },
          });
        }
        migratedApplications++;
      }

      let migratedContacts = 0;
      for (const c of lcontacts as any[]) {
        const name = String(c.name ?? "").trim();
        if (!name) continue;
        const email = (c.email ? String(c.email).trim() : "") || "";
        const company = (c.company ? String(c.company).trim() : "") || null;

        const existing = email
          ? await prisma.contact.findFirst({ where: { userId, email } })
          : await prisma.contact.findFirst({ where: { userId, name, company } });

        const tags = [c.relationship, c.source, c.isMutualConnection ? "mutual" : ""].filter(Boolean).join(",");

        if (existing) {
          await prisma.contact.update({
            where: { id: existing.id },
            data: {
              title: c.title ?? existing.title,
              phone: c.phone ?? existing.phone,
              linkedinUrl: c.linkedIn ?? existing.linkedinUrl,
              notes: (existing.notes ?? "") + (c.notes ? `\n\n${c.notes}` : ""),
              tags: existing.tags || tags || null,
              strength: existing.strength ?? 3,
              lastContactedAt: c.lastContactedAt ?? existing.lastContactedAt,
            },
          });
        } else {
          await prisma.contact.create({
            data: {
              userId,
              name,
              email: email || null,
              company,
              title: c.title ?? null,
              phone: c.phone ?? null,
              linkedinUrl: c.linkedIn ?? null,
              strength: c.isMutualConnection ? 4 : 3,
              tags: tags || null,
              notes: c.notes ?? null,
              lastContactedAt: c.lastContactedAt ?? null,
            },
          });
          migratedContacts++;
        }
      }

      res.json({
        ok: true,
        legacyCounts: { jobs: ljobs.length, applications: lapps.length, contacts: lcontacts.length },
        migrated: { jobs: migratedJobs, applications: migratedApplications, contacts: migratedContacts },
      });
    } catch (e) {
      next(e);
    }
  });

  router.post("/jobs/search", requireAuth, async (req, res) => {
    const schema = z.object({ query: z.string().min(2), location: z.string().optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request" });
    try {
      const results = await searchJobsViaSerpApi(parsed.data);
      return res.json({ ok: true, results });
    } catch (e: any) {
      return res.status(400).json({ error: e instanceof Error ? e.message : "Search failed" });
    }
  });

  router.post("/jobs/import/remotive", requireAuth, async (req, res, next) => {
    try {
      const userId = getUserId(req);
      const { search } = (req.body ?? {}) as { search?: string };
      const jobs = await fetchRemotiveJobs({ search });

      let upserted = 0;
      for (const job of jobs) {
        const company = await prisma.company.upsert({
          where: { userId_name: { userId, name: job.companyName } },
          create: { userId, name: job.companyName },
          update: {},
        });

        await prisma.job.upsert({
          where: {
            userId_source_externalId: { userId, source: job.source, externalId: job.externalId },
          },
          create: {
            userId,
            companyId: company.id,
            source: job.source as any,
            externalId: job.externalId,
            sourceUrl: job.sourceUrl,
            title: job.title,
            location: job.location,
            workMode: job.workMode,
            employmentType: job.employmentType,
            description: job.description,
          },
          update: {
            companyId: company.id,
            sourceUrl: job.sourceUrl,
            title: job.title,
            location: job.location,
            workMode: job.workMode,
            employmentType: job.employmentType,
            description: job.description,
          },
        });
        upserted++;
      }

      return res.json({ imported: jobs.length, upserted });
    } catch (e) {
      next(e);
    }
  });

  router.post("/jobs/import/serpapi", requireAuth, async (req, res, next) => {
    try {
      const schema = z.object({
        title: z.string().min(1),
        companyName: z.string().min(1),
        location: z.string().optional(),
        sourceUrl: z.string().url().optional(),
        description: z.string().optional(),
        via: z.string().optional(),
      });
      const parsed = schema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: "Invalid request" });

      const userId = getUserId(req);
      const r = parsed.data;
      const company = await prisma.company.upsert({
        where: { userId_name: { userId, name: r.companyName } },
        create: { userId, name: r.companyName },
        update: {},
      });

      const externalId = createHash("sha1")
        .update([r.title, r.companyName, r.sourceUrl ?? ""].join("|"))
        .digest("hex")
        .slice(0, 24);

      const job = await prisma.job.upsert({
        where: { userId_source_externalId: { userId, source: "serpapi", externalId } },
        create: {
          userId,
          companyId: company.id,
          source: "serpapi",
          externalId,
          sourceUrl: r.sourceUrl,
          title: r.title,
          location: r.location,
          description: r.description,
        },
        update: {
          companyId: company.id,
          sourceUrl: r.sourceUrl,
          title: r.title,
          location: r.location,
          description: r.description,
        },
      });

      return res.json({ ok: true, jobId: job.id });
    } catch (e) {
      next(e);
    }
  });

  router.post("/jobs/score", requireAuth, async (req, res, next) => {
    try {
      const userId = getUserId(req);
      const { jobId } = (req.body ?? {}) as { jobId?: string };
      const [profile, skills] = await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        prisma.skill.findMany({ where: { userId }, orderBy: { isCore: "desc" } }),
      ]);
      const jobs = await prisma.job.findMany({
        where: { userId, ...(jobId ? { id: jobId } : {}) },
        select: { id: true, title: true, description: true, requirements: true, workMode: true },
      });

      let updated = 0;
      for (const job of jobs) {
        const r = computeMatchScore({ profile, skills, job });
        await prisma.job.update({
          where: { id: job.id },
          data: { matchScore: r.score, matchNotes: r.notes },
        });
        updated++;
      }

      return res.json({ updated });
    } catch (e) {
      next(e);
    }
  });

  router.post("/applications/create", requireAuth, async (req, res, next) => {
    try {
      const userId = getUserId(req);
      const body = (req.body ?? null) as
        | { jobId?: string; stage?: string; appliedAt?: string; autoFollowUpBusinessDays?: number }
        | null;
      const jobId = body?.jobId;
      if (!jobId) return res.status(400).json({ error: "Missing jobId" });

      const existing = await prisma.application.findFirst({
        where: { userId, jobId },
        select: { id: true },
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
        return res.json({ ok: true, applicationId: existing.id, created: false });
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
              : undefined,
        },
        select: { id: true },
      });

      return res.json({ ok: true, applicationId: created.id, created: true });
    } catch (e) {
      next(e);
    }
  });

  router.post("/applications/update", requireAuth, async (req, res, next) => {
    try {
      const schema = z.object({
        applicationId: z.string().min(1),
        stage: z.enum(["INTERESTED", "APPLIED", "RECRUITER_SCREEN", "INTERVIEW", "OFFER", "CLOSED"]).optional(),
        nextFollowUpAt: z.string().nullable().optional(), // YYYY-MM-DD or null
        appliedAt: z.string().nullable().optional(), // ISO string or null
        autoFollowUpBusinessDays: z.number().int().min(1).max(30).optional(),
      });
      const parsed = schema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: "Invalid request" });

      const userId = getUserId(req);
      const { applicationId, stage, nextFollowUpAt, appliedAt, autoFollowUpBusinessDays } = parsed.data;

      const existing = await prisma.application.findFirst({
        where: { id: applicationId, userId },
        select: { id: true },
      });
      if (!existing) return res.status(404).json({ error: "Not found" });

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
        select: { id: true, stage: true, nextFollowUpAt: true, appliedAt: true },
      });

      return res.json({
        ok: true,
        applicationId: updated.id,
        stage: updated.stage,
        nextFollowUpAt: updated.nextFollowUpAt?.toISOString() ?? null,
        appliedAt: updated.appliedAt?.toISOString() ?? null,
      });
    } catch (e) {
      next(e);
    }
  });

  router.post("/applications/linkedin", requireAuth, async (req, res, next) => {
    try {
      const schema = z.object({
        applicationId: z.string().min(1),
        companyLinkedInUrl: z.string().nullable().optional(),
        jobLinkedInUrl: z.string().nullable().optional(),
        contactLinkedInUrl: z.string().nullable().optional(),
        threadLinkedInUrl: z.string().nullable().optional(),
      });
      const parsed = schema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: "Invalid request" });

      const userId = getUserId(req);
      const { applicationId, companyLinkedInUrl, jobLinkedInUrl, contactLinkedInUrl, threadLinkedInUrl } =
        parsed.data;

      const appRow = await prisma.application.findFirst({
        where: { id: applicationId, userId },
        select: { id: true, jobId: true, job: { select: { companyId: true } } },
      });
      if (!appRow) return res.status(404).json({ error: "Not found" });

      await prisma.application.update({
        where: { id: appRow.id },
        data: {
          linkedinContactUrl: contactLinkedInUrl ?? undefined,
          linkedinThreadUrl: threadLinkedInUrl ?? undefined,
        },
      });

      await prisma.job.update({
        where: { id: appRow.jobId },
        data: { linkedinJobUrl: jobLinkedInUrl ?? undefined },
      });

      if (appRow.job.companyId) {
        await prisma.company.update({
          where: { id: appRow.job.companyId },
          data: { linkedinUrl: companyLinkedInUrl ?? undefined },
        });
      }

      return res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  router.get("/export", requireAuth, async (req, res, next) => {
    try {
      const userId = getUserId(req);
      const [profile, skills, companies, jobs, applications, outreach] = await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        prisma.skill.findMany({ where: { userId } }),
        prisma.company.findMany({ where: { userId } }),
        prisma.job.findMany({ where: { userId } }),
        prisma.application.findMany({ where: { userId } }),
        prisma.outreachEmail.findMany({ where: { userId } }),
      ]);
      return res.json({
        version: 1,
        exportedAt: new Date().toISOString(),
        profile,
        skills,
        companies,
        jobs,
        applications,
        outreach,
      });
    } catch (e) {
      next(e);
    }
  });

  router.post("/import", requireAuth, async (req, res, next) => {
    try {
      const userId = getUserId(req);
      const schema = z.object({
        version: z.number().optional(),
        profile: z.any().optional(),
        skills: z.array(z.any()).optional(),
        companies: z.array(z.any()).optional(),
        jobs: z.array(z.any()).optional(),
        applications: z.array(z.any()).optional(),
        outreach: z.array(z.any()).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success || !parsed.data) {
        return res.status(400).json({ error: "Invalid JSON export format" });
      }

      const data = parsed.data;
      if (data.profile) {
        await prisma.profile.upsert({
          where: { userId },
          create: { userId, ...pickProfile(data.profile) },
          update: pickProfile(data.profile),
        });
      }

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
            isCore: Boolean(s.isCore),
          },
          update: {
            level: Number(s.level ?? 3),
            years: s.years != null ? Number(s.years) : null,
            isCore: Boolean(s.isCore),
          },
        });
      }

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
            aiHowToHelp: c.aiHowToHelp ?? null,
          },
          update: {
            website: c.website ?? null,
            location: c.location ?? null,
            industry: c.industry ?? null,
            size: c.size ?? null,
            notes: c.notes ?? null,
            aiSummary: c.aiSummary ?? null,
            aiHowToHelp: c.aiHowToHelp ?? null,
          },
        });
        companiesByName.set(name, saved.id);
      }

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
              matchNotes: j.matchNotes ?? null,
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
              matchNotes: j.matchNotes ?? null,
            },
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
              matchNotes: j.matchNotes ?? null,
            },
          });
          if (j.id) jobsByOldId.set(String(j.id), saved.id);
          importedJobs++;
        }
      }

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
            notes: a.notes ?? null,
          },
        });
        if (a.id) applicationsByOldId.set(String(a.id), saved.id);
        importedApplications++;
      }

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
            gmailMessageId: o.gmailMessageId ?? null,
          },
        });
        importedOutreach++;
      }

      return res.json({ ok: true, importedJobs, importedApplications, importedOutreach });
    } catch (e) {
      next(e);
    }
  });

  router.post("/google/contacts/import", requireAuth, async (req, res, next) => {
    try {
      const userId = getUserId(req);
      const { AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET } = jobtrackerEnv();
      if (!AUTH_GOOGLE_ID || !AUTH_GOOGLE_SECRET) {
        return res.status(400).json({ error: "Google OAuth not configured" });
      }

      const account = await prisma.account.findFirst({ where: { userId, provider: "google" } });
      if (!account?.refresh_token) {
        return res.status(400).json({ error: "Google account not connected or missing refresh token" });
      }

      const { google } = (await import("googleapis")) as any;
      const oauth2 = new google.auth.OAuth2({ clientId: AUTH_GOOGLE_ID, clientSecret: AUTH_GOOGLE_SECRET });
      oauth2.setCredentials({
        refresh_token: account.refresh_token,
        access_token: account.access_token ?? undefined,
      });

      const people = google.people({ version: "v1", auth: oauth2 });
      const apiRes = await people.people.connections.list({
        resourceName: "people/me",
        pageSize: 200,
        personFields: "names,emailAddresses,phoneNumbers,organizations,urls",
      });

      const connections = (apiRes?.data?.connections ?? []) as any[];
      let imported = 0;
      for (const p of connections) {
        const name = p.names?.[0]?.displayName?.trim() || "";
        if (!name) continue;
        const email = p.emailAddresses?.[0]?.value?.trim() || "";
        const phone = p.phoneNumbers?.[0]?.value?.trim() || "";
        const org = p.organizations?.[0]?.name?.trim() || "";
        const title = p.organizations?.[0]?.title?.trim() || "";

        const existing = email
          ? await prisma.contact.findFirst({ where: { userId, email } })
          : await prisma.contact.findFirst({ where: { userId, name, company: org || null } });

        if (existing) {
          await prisma.contact.update({
            where: { id: existing.id },
            data: {
              phone: phone || existing.phone,
              company: org || existing.company,
              title: title || existing.title,
            },
          });
        } else {
          await prisma.contact.create({
            data: {
              userId,
              name,
              email: email || null,
              phone: phone || null,
              company: org || null,
              title: title || null,
              strength: 3,
            },
          });
          imported++;
        }
      }

      return res.json({ ok: true, imported, total: connections.length });
    } catch (e) {
      next(e);
    }
  });

  router.post("/gmail/send", requireAuth, async (req, res, next) => {
    try {
      const userId = getUserId(req);
      const { AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET } = jobtrackerEnv();
      if (!AUTH_GOOGLE_ID || !AUTH_GOOGLE_SECRET) {
        return res.status(400).json({ error: "Google OAuth not configured (missing AUTH_GOOGLE_ID/SECRET)" });
      }

      const body = (req.body ?? null) as
        | {
            to: string;
            cc?: string;
            subject: string;
            bodyText: string;
            applicationId?: string;
            tone?: "WARM" | "NEUTRAL" | "DIRECT";
            humanLevel?: number;
            autoFollowUpBusinessDays?: number;
          }
        | null;

      if (!body?.to || !body.subject || !body.bodyText) {
        return res.status(400).json({ error: "Missing to/subject/bodyText" });
      }

      const account = await prisma.account.findFirst({ where: { userId, provider: "google" } });
      if (!account?.refresh_token) {
        return res.status(400).json({ error: "Google account not connected or missing refresh token" });
      }

      const sent = await sendGmailMessage({
        googleClientId: AUTH_GOOGLE_ID,
        googleClientSecret: AUTH_GOOGLE_SECRET,
        refreshToken: account.refresh_token,
        accessToken: account.access_token,
        to: body.to,
        cc: body.cc,
        subject: body.subject,
        bodyText: body.bodyText,
      });

      const saved = await prisma.outreachEmail.create({
        data: {
          userId,
          applicationId: body.applicationId,
          toEmail: body.to,
          ccEmail: body.cc,
          subject: body.subject,
          bodyText: body.bodyText,
          tone: body.tone ?? "NEUTRAL",
          humanLevel: typeof body.humanLevel === "number" ? body.humanLevel : 70,
          sentAt: new Date(),
          gmailMessageId: sent.id,
        },
      });

      if (body.applicationId && typeof body.autoFollowUpBusinessDays === "number") {
        const days = Math.max(0, Math.min(30, Math.floor(body.autoFollowUpBusinessDays)));
        if (days > 0) {
          await prisma.application.updateMany({
            where: { id: body.applicationId, userId },
            data: { nextFollowUpAt: addBusinessDays(new Date(), days) },
          });
        }
      }

      return res.json({ ok: true, gmailMessageId: sent.id, outreachId: saved.id });
    } catch (e) {
      next(e);
    }
  });

  // AI drafting routes
  router.post("/ai/company-fit", requireAuth, async (req, res, next) => {
    try {
      const userId = getUserId(req);
      const client = getJobtrackerOpenAIClient();
      if (!client) return res.status(400).json({ error: "OPENAI_API_KEY not set (AI disabled)" });

      const schema = z.object({ companyId: z.string().optional(), jobId: z.string().optional() });
      const parsed = schema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: "Invalid request" });

      const { companyId, jobId } = parsed.data;
      if (!companyId && !jobId) return res.status(400).json({ error: "Provide companyId or jobId" });

      const job = jobId
        ? await prisma.job.findFirst({ where: { id: jobId, userId }, include: { company: true } })
        : null;
      const company = companyId
        ? await prisma.company.findFirst({ where: { id: companyId, userId } })
        : job?.company ?? null;
      if (!company) return res.status(404).json({ error: "Company not found" });

      const [profile, skills] = await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        prisma.skill.findMany({ where: { userId }, orderBy: [{ isCore: "desc" }] }),
      ]);

      const prompt = [
        "You are an elite recruiting strategist helping a candidate understand a company and position themselves.",
        "",
        `Company: ${company.name}`,
        company.website ? `Website: ${company.website}` : "",
        job ? `Role: ${job.title}` : "",
        job?.description ? `Job description:\n${job.description.slice(0, 5000)}` : "",
        profile?.summary ? `Candidate summary:\n${profile.summary.slice(0, 1500)}` : "",
        skills.length ? `Candidate skills: ${skills.slice(0, 20).map((s) => s.name).join(", ")}` : "",
        "",
        "Return JSON with keys:",
        "- summary: 3-5 bullets describing what the company likely values and how it operates (do not invent facts; use 'likely' if unsure)",
        "- howToHelp: 3-5 bullets describing how the candidate could help (specific, measurable impact)",
        "- cultureSignals: 3 bullets of culture/working-style signals to probe in interviews",
        "- interviewAngles: 3 bullets with angles/stories the candidate should lead with",
        "",
        "Be concise. No fluff.",
      ]
        .filter(Boolean)
        .join("\n");

      const { OPENAI_MODEL } = jobtrackerEnv();
      const completion = await client.chat.completions.create({
        model: OPENAI_MODEL,
        temperature: 0.5,
        messages: [{ role: "user", content: prompt }],
      });

      const text = completion.choices[0]?.message?.content ?? "";
      const json = safeJson(text);
      if (!json?.summary || !json?.howToHelp) return res.status(502).json({ error: "AI response format error" });

      const saved = await prisma.company.update({
        where: { id: company.id },
        data: { aiSummary: JSON.stringify(json.summary), aiHowToHelp: JSON.stringify(json.howToHelp) },
      });

      return res.json({
        companyId: saved.id,
        summary: json.summary,
        howToHelp: json.howToHelp,
        cultureSignals: json.cultureSignals ?? [],
        interviewAngles: json.interviewAngles ?? [],
      });
    } catch (e) {
      next(e);
    }
  });

  router.post("/ai/outreach-draft", requireAuth, async (req, res, next) => {
    try {
      const userId = getUserId(req);
      const client = getJobtrackerOpenAIClient();
      if (!client) return res.status(400).json({ error: "OPENAI_API_KEY not set (AI drafting disabled)" });

      const schema = z.object({
        jobId: z.string().optional(),
        companyName: z.string().optional(),
        roleTitle: z.string().optional(),
        tone: z.enum(["WARM", "NEUTRAL", "DIRECT"]).default("NEUTRAL"),
        humanLevel: z.number().min(0).max(100).default(70),
        extraNotes: z.string().optional().default(""),
      });
      const parsed = schema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: "Invalid request" });
      const input = parsed.data;

      const [profile, skills] = await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        prisma.skill.findMany({ where: { userId }, orderBy: [{ isCore: "desc" }, { level: "desc" }] }),
      ]);

      const job =
        input.jobId
          ? await prisma.job.findFirst({ where: { id: input.jobId, userId }, include: { company: true } })
          : null;

      const companyName = input.companyName ?? job?.company?.name ?? "the company";
      const roleTitle = input.roleTitle ?? job?.title ?? "the role";
      const skillLine =
        skills.length === 0 ? "Skills: (not provided)" : `Skills: ${skills.slice(0, 18).map((s) => s.name).join(", ")}`;
      const profileSummary = profile?.summary || profile?.headline || profile?.resumeText || "";

      const toneGuide =
        input.tone === "WARM"
          ? "Warm, friendly, upbeat. Confident but not salesy."
          : input.tone === "DIRECT"
            ? "Direct, concise, high-signal. No fluff."
            : "Neutral, professional, clear and human.";

      const humanGuide =
        input.humanLevel >= 80
          ? "Sound very human: varied sentence lengths, light natural phrasing, avoid corporate buzzwords."
          : input.humanLevel >= 50
            ? "Sound human but professional: minimal jargon, clear structure."
            : "Sound formal and structured: short sentences, very businesslike.";

      const jobContext = job?.description ? `Job description:\n${job.description.slice(0, 6000)}` : "";

      const prompt = [
        "You are an elite recruiting agency writing a first outreach email.",
        "Write an email that helps the candidate get a reply.",
        "",
        `Target company: ${companyName}`,
        `Role: ${roleTitle}`,
        skillLine,
        profileSummary ? `Candidate summary:\n${profileSummary.slice(0, 2500)}` : "",
        jobContext,
        input.extraNotes ? `Extra notes:\n${input.extraNotes.slice(0, 1200)}` : "",
        "",
        "Constraints:",
        `- Tone: ${toneGuide}`,
        `- Human sounding: ${humanGuide}`,
        "- Keep it under 170 words.",
        "- Include 2 concrete value points tailored to the role/company.",
        "- End with a clear, low-friction call to action (15-min chat or quick question).",
        "- Do not mention being an AI.",
        "",
        "Return JSON with keys: subject, bodyText (plain text).",
      ]
        .filter(Boolean)
        .join("\n");

      const { OPENAI_MODEL } = jobtrackerEnv();
      const completion = await client.chat.completions.create({
        model: OPENAI_MODEL,
        temperature: 0.6,
        messages: [{ role: "user", content: prompt }],
      });

      const text = completion.choices[0]?.message?.content ?? "";
      const json = safeJson(text);
      if (!json?.subject || !json?.bodyText) {
        return res.status(502).json({ error: "AI response format error. Try again." });
      }
      return res.json({ subject: String(json.subject), bodyText: String(json.bodyText) });
    } catch (e) {
      next(e);
    }
  });

  router.post("/ai/followup-draft", requireAuth, async (req, res, next) => {
    try {
      const userId = getUserId(req);
      const client = getJobtrackerOpenAIClient();
      if (!client) return res.status(400).json({ error: "OPENAI_API_KEY not set (AI drafting disabled)" });

      const schema = z.object({
        applicationId: z.string().min(1),
        tone: z.enum(["WARM", "NEUTRAL", "DIRECT"]).default("NEUTRAL"),
        humanLevel: z.number().min(0).max(100).default(70),
      });
      const parsed = schema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: "Invalid request" });
      const input = parsed.data;

      const appRow = await prisma.application.findFirst({
        where: { id: input.applicationId, userId },
        include: { job: { include: { company: true } }, outreach: { orderBy: { sentAt: "desc" } } },
      });
      if (!appRow) return res.status(404).json({ error: "Application not found" });

      const [profile, skills] = await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        prisma.skill.findMany({ where: { userId }, orderBy: [{ isCore: "desc" }, { level: "desc" }] }),
      ]);

      const last = appRow.outreach.find((e) => Boolean(e.sentAt)) ?? appRow.outreach[0] ?? null;
      const lastBody = last?.bodyText ?? "";
      const lastSubject = last?.subject ?? "";

      const toneGuide =
        input.tone === "WARM"
          ? "Warm, friendly, upbeat. Confident but not salesy."
          : input.tone === "DIRECT"
            ? "Direct, concise, high-signal. No fluff."
            : "Neutral, professional, clear and human.";
      const humanGuide =
        input.humanLevel >= 80
          ? "Sound very human: varied sentence lengths, light natural phrasing, avoid corporate buzzwords."
          : input.humanLevel >= 50
            ? "Sound human but professional: minimal jargon, clear structure."
            : "Sound formal and structured: short sentences, very businesslike.";
      const skillLine =
        skills.length === 0 ? "Skills: (not provided)" : `Skills: ${skills.slice(0, 16).map((s) => s.name).join(", ")}`;
      const profileSummary = profile?.summary || profile?.headline || "";

      const prompt = [
        "You are an elite recruiting agency writing a follow-up email for a candidate.",
        "",
        `Company: ${appRow.job.company?.name ?? "the company"}`,
        `Role: ${appRow.job.title}`,
        `Candidate summary: ${profileSummary || "(not provided)"}`,
        skillLine,
        "",
        lastSubject ? `Previous subject: ${lastSubject}` : "",
        lastBody ? `Previous email body:\n${lastBody.slice(0, 2500)}` : "",
        "",
        "Goal:",
        "- Write a short follow-up that references the previous note naturally (without sounding pushy).",
        "- Add 1 fresh, specific value point (relevant to the role).",
        "- End with a low-friction CTA.",
        "",
        "Constraints:",
        `- Tone: ${toneGuide}`,
        `- Human sounding: ${humanGuide}`,
        "- 70–120 words.",
        "- Plain text.",
        "- Do not mention being an AI.",
        "",
        "Return JSON with keys: subject, bodyText.",
      ]
        .filter(Boolean)
        .join("\n");

      const { OPENAI_MODEL } = jobtrackerEnv();
      const completion = await client.chat.completions.create({
        model: OPENAI_MODEL,
        temperature: 0.55,
        messages: [{ role: "user", content: prompt }],
      });

      const text = completion.choices[0]?.message?.content ?? "";
      const json = safeJson(text);
      if (!json?.subject || !json?.bodyText) return res.status(502).json({ error: "AI response format error" });
      return res.json({ subject: String(json.subject), bodyText: String(json.bodyText) });
    } catch (e) {
      next(e);
    }
  });

  router.post("/ai/job-deep-dive", requireAuth, async (req, res, next) => {
    try {
      const userId = getUserId(req);
      const client = getJobtrackerOpenAIClient();
      if (!client) return res.status(400).json({ error: "OPENAI_API_KEY not set (AI disabled)" });

      const schema = z.object({ jobId: z.string().min(1) });
      const parsed = schema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: "Invalid request" });

      const job = await prisma.job.findFirst({
        where: { id: parsed.data.jobId, userId },
        include: { company: true },
      });
      if (!job) return res.status(404).json({ error: "Job not found" });

      const [profile, skills] = await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        prisma.skill.findMany({ where: { userId }, orderBy: [{ isCore: "desc" }, { level: "desc" }] }),
      ]);

      const baseline = computeMatchScore({
        profile,
        skills,
        job: { title: job.title, description: job.description, requirements: job.requirements, workMode: job.workMode },
      });

      const prompt = [
        "You are an elite headhunter and interview coach.",
        "Analyze the job and the candidate and produce a deep-dive fit report that helps the candidate win.",
        "",
        `Company: ${job.company?.name ?? "Unknown company"}`,
        `Role: ${job.title}`,
        job.location ? `Location: ${job.location}` : "",
        job.workMode ? `Work mode: ${job.workMode}` : "",
        "",
        job.description ? `Job description:\n${String(job.description).slice(0, 6500)}` : "",
        job.requirements ? `Requirements:\n${String(job.requirements).slice(0, 2500)}` : "",
        "",
        profile?.summary ? `Candidate summary:\n${String(profile.summary).slice(0, 1800)}` : "",
        profile?.resumeText ? `Candidate resume text:\n${String(profile.resumeText).slice(0, 4000)}` : "",
        skills.length ? `Candidate skills: ${skills.slice(0, 25).map((s) => s.name).join(", ")}` : "",
        "",
        "Return JSON with keys:",
        "- fitScore: number 0..100 (your best estimate, can differ from baseline)",
        "- strengths: 4-6 bullets showing why they fit (grounded in the provided candidate info)",
        "- gaps: 3-5 bullets on gaps/risks and how to address them",
        "- missingSkills: 5-10 keywords that appear important but not clearly present in candidate info",
        "- resumeTweaks: 3-5 bullet rewrites that would improve alignment",
        "- interviewAngles: 4-6 bullets (stories/angles + suggested metrics)",
        "- outreachHooks: 3 short hooks to use in outreach (1 sentence each)",
        "- questionsToAsk: 5 strong questions to ask the hiring manager",
        "",
        "Constraints:",
        "- Do not invent facts about the candidate or company; use conditional language if unsure.",
        "- Keep it concise but high-signal.",
      ]
        .filter(Boolean)
        .join("\n");

      const { OPENAI_MODEL } = jobtrackerEnv();
      const completion = await client.chat.completions.create({
        model: OPENAI_MODEL,
        temperature: 0.45,
        messages: [{ role: "user", content: prompt }],
      });

      const text = completion.choices[0]?.message?.content ?? "";
      const json = safeJson(text);
      if (!json) return res.status(502).json({ error: "AI response format error" });

      const fitScore = typeof json.fitScore === "number" ? Math.max(0, Math.min(100, json.fitScore)) : baseline.score;
      await prisma.job.update({
        where: { id: job.id },
        data: { matchScore: fitScore, matchNotes: baseline.notes || job.matchNotes, aiDeepDive: JSON.stringify({ baseline, report: json }) },
      });

      return res.json({ ok: true, baseline, report: json });
    } catch (e) {
      next(e);
    }
  });

  router.post("/ai/linkedin-message", requireAuth, async (req, res, next) => {
    try {
      const userId = getUserId(req);
      const client = getJobtrackerOpenAIClient();
      if (!client) return res.status(400).json({ error: "OPENAI_API_KEY not set (AI disabled)" });

      const schema = z.object({
        applicationId: z.string().min(1),
        tone: z.enum(["WARM", "NEUTRAL", "DIRECT"]).default("NEUTRAL"),
        humanLevel: z.number().min(0).max(100).default(70),
        extraNotes: z.string().optional().default(""),
      });
      const parsed = schema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: "Invalid request" });
      const input = parsed.data;

      const appRow = await prisma.application.findFirst({
        where: { id: input.applicationId, userId },
        include: { job: { include: { company: true } } },
      });
      if (!appRow) return res.status(404).json({ error: "Application not found" });

      const [profile, skills] = await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        prisma.skill.findMany({ where: { userId }, orderBy: [{ isCore: "desc" }, { level: "desc" }] }),
      ]);

      const toneGuide =
        input.tone === "WARM"
          ? "Warm, friendly, upbeat. Confident but not salesy."
          : input.tone === "DIRECT"
            ? "Direct, concise, high-signal. No fluff."
            : "Neutral, professional, clear and human.";
      const humanGuide =
        input.humanLevel >= 80
          ? "Sound very human and natural. Avoid buzzwords."
          : input.humanLevel >= 50
            ? "Sound human but professional. Clear structure."
            : "Sound formal and structured.";
      const skillLine =
        skills.length === 0 ? "Skills: (not provided)" : `Skills: ${skills.slice(0, 12).map((s) => s.name).join(", ")}`;

      const prompt = [
        "You are an elite headhunter writing a LinkedIn message (DM or connection note).",
        "Write something that gets a reply.",
        "",
        `Company: ${appRow.job.company?.name ?? "the company"}`,
        `Role: ${appRow.job.title}`,
        appRow.job.location ? `Location: ${appRow.job.location}` : "",
        profile?.headline ? `Candidate headline: ${profile.headline}` : "",
        profile?.summary ? `Candidate summary: ${String(profile.summary).slice(0, 900)}` : "",
        skillLine,
        input.extraNotes ? `Extra notes: ${input.extraNotes.slice(0, 500)}` : "",
        "",
        "Constraints:",
        `- Tone: ${toneGuide}`,
        `- Human sounding: ${humanGuide}`,
        "- 350 characters max (LinkedIn-friendly).",
        "- 1 specific value point + 1 clear ask.",
        "- No emojis unless requested (don’t use emojis).",
        "",
        "Return JSON with key: messageText.",
      ]
        .filter(Boolean)
        .join("\n");

      const { OPENAI_MODEL } = jobtrackerEnv();
      const completion = await client.chat.completions.create({
        model: OPENAI_MODEL,
        temperature: 0.6,
        messages: [{ role: "user", content: prompt }],
      });

      const text = completion.choices[0]?.message?.content ?? "";
      const json = safeJson(text);
      if (!json?.messageText) return res.status(502).json({ error: "AI response format error" });
      return res.json({ messageText: String(json.messageText) });
    } catch (e) {
      next(e);
    }
  });

  router.post("/ai/contact-outreach", requireAuth, async (req, res, next) => {
    try {
      const userId = getUserId(req);
      const client = getJobtrackerOpenAIClient();
      if (!client) return res.status(400).json({ error: "OPENAI_API_KEY not set (AI disabled)" });

      const schema = z.object({
        applicationId: z.string().min(1),
        contactId: z.string().min(1),
        channel: z.enum(["EMAIL", "LINKEDIN", "FACEBOOK", "INSTAGRAM"]).default("LINKEDIN"),
        tone: z.enum(["WARM", "NEUTRAL", "DIRECT"]).default("NEUTRAL"),
        humanLevel: z.number().min(0).max(100).default(70),
        extraNotes: z.string().optional().default(""),
      });
      const parsed = schema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: "Invalid request" });
      const input = parsed.data;

      const [appRow, contact, link, profile, skills] = await Promise.all([
        prisma.application.findFirst({ where: { id: input.applicationId, userId }, include: { job: { include: { company: true } } } }),
        prisma.contact.findFirst({ where: { id: input.contactId, userId } }),
        prisma.applicationContact.findFirst({ where: { applicationId: input.applicationId, contactId: input.contactId } }),
        prisma.profile.findUnique({ where: { userId } }),
        prisma.skill.findMany({ where: { userId }, orderBy: [{ isCore: "desc" }, { level: "desc" }] }),
      ]);

      if (!appRow) return res.status(404).json({ error: "Application not found" });
      if (!contact) return res.status(404).json({ error: "Contact not found" });

      const toneGuide =
        input.tone === "WARM"
          ? "Warm, friendly, upbeat. Confident but not salesy."
          : input.tone === "DIRECT"
            ? "Direct, concise, high-signal. No fluff."
            : "Neutral, professional, clear and human.";

      const humanGuide =
        input.humanLevel >= 80
          ? "Sound very human: varied sentence lengths, light natural phrasing, avoid buzzwords."
          : input.humanLevel >= 50
            ? "Sound human but professional: minimal jargon, clear structure."
            : "Sound formal and structured: short sentences, very businesslike.";

      const channelRules =
        input.channel === "EMAIL" ? "Write an email. Include a subject. 90–160 words." : "Write a short DM. 250–450 characters. Plain text.";

      const relationship = link?.relationship || "";
      const strength = contact.strength ?? 3;
      const skillLine = skills.length === 0 ? "" : `Candidate skills: ${skills.slice(0, 12).map((s) => s.name).join(", ")}`;

      const prompt = [
        "You are an elite headhunter helping a candidate get a referral/introduction.",
        "",
        `Channel: ${input.channel}`,
        `Rules: ${channelRules}`,
        `Tone: ${toneGuide}`,
        `Human sounding: ${humanGuide}`,
        "",
        `Contact: ${contact.name}${contact.title ? `, ${contact.title}` : ""}${contact.company ? ` at ${contact.company}` : ""}`,
        relationship ? `Relationship label: ${relationship}` : "",
        `Relationship strength (1-5): ${strength}`,
        "",
        `Target role: ${appRow.job.title}`,
        `Target company: ${appRow.job.company?.name ?? "Unknown company"}`,
        appRow.job.location ? `Location: ${appRow.job.location}` : "",
        "",
        profile?.summary ? `Candidate summary:\n${String(profile.summary).slice(0, 900)}` : "",
        profile?.headline ? `Candidate headline: ${profile.headline}` : "",
        skillLine,
        input.extraNotes ? `Extra notes:\n${input.extraNotes.slice(0, 600)}` : "",
        "",
        "Constraints:",
        "- Ask for a specific action: intro to recruiter/HM, forward resume, or advice on best contact.",
        "- Include 1 concrete value point relevant to the role.",
        "- Make it easy to reply yes/no.",
        "- Do not mention being an AI.",
        "",
        input.channel === "EMAIL" ? "Return JSON with keys: subject, bodyText." : "Return JSON with key: messageText.",
      ].join("\n");

      const { OPENAI_MODEL } = jobtrackerEnv();
      const completion = await client.chat.completions.create({
        model: OPENAI_MODEL,
        temperature: 0.6,
        messages: [{ role: "user", content: prompt }],
      });

      const text = completion.choices[0]?.message?.content ?? "";
      const json = safeJson(text);
      if (!json) return res.status(502).json({ error: "AI response format error" });

      if (input.channel === "EMAIL") {
        if (!json.subject || !json.bodyText) {
          return res.status(502).json({ error: "AI response missing subject/bodyText" });
        }
        return res.json({ subject: String(json.subject), bodyText: String(json.bodyText) });
      }

      if (!json.messageText) return res.status(502).json({ error: "AI response missing messageText" });
      return res.json({ messageText: String(json.messageText) });
    } catch (e) {
      next(e);
    }
  });

  // Mount at both paths to ease migration:
  // - `/jobtracker/api/*` supports the legacy Next.js basePath
  // - `/api/jobtracker/*` is a natural path for the SPA
  app.use("/jobtracker/api", router);
  app.use("/api/jobtracker", router);
}

