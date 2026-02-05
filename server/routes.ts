// ROOT CAUSE: TypeError: pdfParse is not a function - due to ESM/CommonJS import mismatch with pdf-parse in server/routes.ts.
// FIX: Consolidated extraction into robust extractResumeText helper with .default fallback and refined error handling.

import express, { type Express, type Request, type Response } from "express";
import type { Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { 
  insertJobSchema, 
  insertApplicationSchema, 
  insertContactSchema, 
  insertDailyActionSchema, 
  insertScriptSchema,
  insertResumeProfileSchema,
  insertJobArchetypeSchema,
  insertInterviewStorySchema,
  insertOutreachTemplateSchema,
  insertWeeklyPlanSchema,
  insertCalendarEventSchema,
} from "@shared/schema";
import OpenAI from "openai";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { loopWatchdogMiddleware } from "./middleware/loop-watchdog";
import { registerJobtrackerApi } from "./jobtracker-api";
import multer from "multer";
import mammoth from "mammoth";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import crypto from "crypto";

// Robustly handle pdf-parse which lacks a default export in some ESM environments
import * as pdfParseModule from "pdf-parse";
const pdfParse = (pdfParseModule as any).default || pdfParseModule;

let cachedOpenAI: OpenAI | undefined;
function getOpenAIClient(): OpenAI {
  // Prefer Replit AI integration env vars; fall back to standard OpenAI env vars.
  const apiKey =
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    const err: any = new Error(
      "OpenAI is not configured. Set AI_INTEGRATIONS_OPENAI_API_KEY (or OPENAI_API_KEY) to enable AI features.",
    );
    err.status = 503;
    throw err;
  }

  if (!cachedOpenAI) {
    cachedOpenAI = new OpenAI({
      apiKey,
      baseURL:
        process.env.AI_INTEGRATIONS_OPENAI_BASE_URL?.trim() ||
        process.env.OPENAI_BASE_URL?.trim(),
    });
  }

  return cachedOpenAI;
}

function hasOpenAIKeyConfigured() {
  const apiKey =
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim();
  return Boolean(apiKey);
}

function stripHtml(input: string) {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function estimateMatchScore(title: string, description: string) {
  const text = `${title} ${description}`.toLowerCase();
  const keywords: Array<[RegExp, number]> = [
    [/\boperations?\b|\boperator\b|\bstore\b|\bretail\b|\bwarehouse\b|\blogistics\b|\bsupply chain\b/, 22],
    [/\bsales\b|\bbusiness development\b|\bbizdev\b|\baccount exec\b|\baccount executive\b|\baccount manager\b/, 22],
    [/\bmanager\b|\bdirector\b|\bvp\b|\blead\b/, 14],
    [/\bamazon\b|\be-commerce\b|\bmarketplace\b/, 10],
    [/\bprocurement\b|\bvendor\b|\bsourcing\b/, 10],
    [/\bai\b|\bautomation\b|\bworkflow\b/, 8],
  ];

  let score = 45;
  for (const [re, pts] of keywords) if (re.test(text)) score += pts;
  return Math.max(35, Math.min(95, score));
}

function scoreToPriority(score: number) {
  if (score >= 82) return "high";
  if (score >= 65) return "medium";
  return "low";
}

async function fetchRemotiveJobs(opts: { search?: string }) {
  const search = (opts.search || "").trim();
  const url = new URL("https://remotive.com/api/remote-jobs");
  if (search) url.searchParams.set("search", search);

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "Career-Scout/1.0 (+local)",
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err: any = new Error(`Remotive fetch failed (${res.status})`);
    err.status = 502;
    err.detail = text.slice(0, 500);
    throw err;
  }
  const json: any = await res.json();
  const jobs = Array.isArray(json?.jobs) ? json.jobs : [];
  return jobs as any[];
}

const RESUME_CONTEXT = `
Candidate: Gerald (Ned) Thomas Pearson Jr
Location: Baton Rouge, LA 70809
Phone: 225-328-2500
Email: nedpearson@gmail.com

SUMMARY:
Sales and operations background with experience building product lines, managing retail locations, and working with international suppliers. Use AI tools for workflow automation and market research. Comfortable with both startup environments and established operations. More interested in learning the right business with the right team than starting at a specific level. Looking for an opportunity to contribute and grow.

EXPERIENCE HIGHLIGHTS:
- Sales & Customer Relations
- Product Development
- Vendor & Supplier Coordination
- Multi-Location Operations
- Import/Export & Logistics
- AI Workflow Development
- Competitive Analysis & Research
- E-Commerce Channels
- Inventory Management
- Trade Show Experience

WORK HISTORY:

PEARSON'S LUGGAGE & GIFTS | Operations & Sales | Baton Rouge, LA | 2005-2024
- Handled operations for 5 retail locations including sales, buying, and inventory
- Set up Amazon marketplace channel and managed online sales
- Used AI tools to streamline workflows and identify market opportunities
- Worked with vendors and managed warehouse operations across multiple states

SOUTHERN AUTHORITY | Product Development | Baton Rouge, LA | 2016-2018
- Developed school backpack line as a Northface alternative
- Worked with overseas manufacturers on design and production
- Managed import logistics and quality control

300 CONCEPTS / AUDIOBOMB | Product Management | Baton Rouge, LA | 2012-2016
- Worked on Bluetooth speaker products when the technology was new in 2012
- Traveled to China to source components and coordinate design changes
- Built relationships with distribution companies and managed trade show presence

AFTERMATH INDUSTRIES & PW HAULING | Operations | Louisiana | 2005-2007
- Managed cleanup and demolition crews during Hurricane Katrina recovery
- Coordinated subcontractors and worked with FEMA and insurance adjusters

VECTOR MARKETING - CUTCO | Sales Representative | Louisiana | 1995-2000
- Direct sales - ranked 32nd nationally out of thousands of reps
- Built territory and trained new representatives

PROFESSIONAL BACKGROUND:
- Past Board Member, National Luggage Dealers Association (2018-2021)
- Guest Speaker, LSU Entrepreneur Class (2020)
- Past Rotary Member, Baton Rouge (2017-2021)
- Past Member, Baton Rouge Country Club (1992-2025)

EDUCATION:
- Southeastern Louisiana University | Business Studies | 1999-2005
- Tara High School - Founded Golf Team
- University High School - State Golf Champion (1996)

TECHNICAL SKILLS:
QuickBooks, Amazon Seller Central, AI Development Platforms, Excel, POS Systems, Inventory Software, Import/Export

LOCATION PRIORITY:
Home ZIP: 70809 (Baton Rouge, LA)
- Priority 1: Local jobs within 15 miles of 70809
- Priority 2: Regional jobs within 50 miles (Gonzales, Denham Springs, Hammond)
- Priority 3: Remote positions
`;

async function extractResumeText(opts: {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}): Promise<string> {
  const { buffer, filename, mimetype } = opts;
  const lowerName = filename.toLowerCase();

  const isPdf =
    mimetype === "application/pdf" || lowerName.endsWith(".pdf");
  const isDocx =
    mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx");

  if (!isPdf && !isDocx) {
    const err: any = new Error("Unsupported file type");
    err.code = "UNSUPPORTED_FILE_TYPE";
    throw err;
  }

  try {
    if (isPdf) {
      // In Node/ESM on Replit, pdf-parse might need special handling
      const result = await pdfParse(buffer);
      return (result.text || "").trim();
    }

    if (isDocx) {
      const result = await mammoth.extractRawText({ buffer });
      return (result.value || "").trim();
    }

    throw new Error("Unsupported file type");
  } catch (e: any) {
    const err: any = new Error(
      `TEXT_EXTRACTION_FAILED: ${e?.message || "Unknown error"}`
    );
    err.code = "TEXT_EXTRACTION_FAILED";
    throw err;
  }
}

async function runResumeAnalysis(resumeContent: string, resumeFileName: string) {
  const completion = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a professional career coach and resume analyst. Analyze the provided resume and provide actionable feedback. Be direct and honest - no corporate fluff. Focus on what would actually help this person land a job.

Return your analysis as JSON with this structure:
{
  "strengths": ["list of 3-5 key strengths from the resume"],
  "weaknesses": ["list of 2-4 areas that need improvement"],
  "suggestions": ["list of 3-5 specific, actionable suggestions to improve the resume"],
  "keySkills": ["list of 5-10 most marketable skills extracted from the resume"],
  "experienceLevel": "junior | mid-level | senior | executive",
  "industryFocus": ["list of 2-4 industries this resume is best suited for"],
  "overallScore": 75,
  "summary": "2-3 sentence overview of the candidate's profile"
}`
      },
      {
        role: "user",
        content: `Analyze this resume: ${resumeFileName}\n\n${resumeContent}`
      }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 2000,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI");
  return JSON.parse(content);
}

export async function registerRoutes(server: Server, app: Express): Promise<void> {
  app.use(loopWatchdogMiddleware);
  setupAuth(app);
  registerObjectStorageRoutes(app);

  // Health check (used by Railway and uptime monitors)
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  const isAuthenticated = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) return next();
    res.sendStatus(401);
  };

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  app.post("/api/profile/upload-resume", isAuthenticated, upload.single("file"), async (req: Request, res: Response, next: any) => {
    const debugId = uuidv4();

    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({
          ok: false,
          code: "NO_FILE",
          message: "Please select a resume file to upload.",
          debugId,
        });
      }

      const { originalname, mimetype, size, buffer } = file;

      if (size <= 0 || !buffer || buffer.length === 0) {
        return res.status(400).json({
          ok: false,
          code: "EMPTY_FILE",
          message: "Uploaded resume seems to be empty. Please try another file.",
          debugId,
        });
      }

      if (size > 10 * 1024 * 1024) {
        return res.status(400).json({
          ok: false,
          code: "FILE_TOO_LARGE",
          message: "Resume file is too large. Please upload a file under 10 MB.",
          debugId,
        });
      }

      let text: string;
      try {
        text = await extractResumeText({
          buffer,
          filename: originalname,
          mimetype,
        });
      } catch (err: any) {
        console.error("[RESUME_EXTRACTION_ERROR]", {
          debugId,
          fileName: originalname,
          mimetype,
          size,
          code: err?.code,
          message: err?.message,
          stack: err?.stack,
        });

        const code = err?.code || "TEXT_EXTRACTION_FAILED";

        if (code === "UNSUPPORTED_FILE_TYPE") {
          return res.status(400).json({
            ok: false,
            code,
            message: "Only PDF and DOCX resumes are supported.",
            debugId,
          });
        }

        return res.status(400).json({
          ok: false,
          code,
          message: "Unable to extract text from this resume. Please try exporting it as a standard PDF or DOCX with selectable text.",
          debugId,
        });
      }

      if (!text || text.trim().length === 0) {
        return res.status(400).json({
          ok: false,
          code: "EMPTY_TEXT",
          message: "We could not find selectable text in this file. If it is a scanned image, please upload a text-based PDF or DOCX.",
          debugId,
        });
      }

      // Run analysis logic
      const analysis = await runResumeAnalysis(text, originalname);

      // Update user profile with resume data
      const updatedProfile = await storage.updateProfile(req.user!.id, {
        resumeContent: text,
        resumeFileName: originalname,
        resumeAnalysis: analysis,
        summary: analysis.summary,
        skills: analysis.keySkills || [],
      });

      return res.json({
        ok: true,
        rawText: text,
        ...analysis,
        profile: updatedProfile,
        debugId,
      });
    } catch (err: any) {
      next(err);
    }
  });

  app.post("/api/profile/analyze-resume", isAuthenticated, async (req, res, next) => {
    const debugId = uuidv4();
    try {
      const schema = z.object({
        resumeContent: z.string().min(50, "Resume content too short").max(50000, "Resume content too long"),
        resumeFileName: z.string().optional(),
      });
      
      const validation = schema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          ok: false, 
          code: "INVALID_INPUT", 
          message: validation.error.errors[0]?.message || "Invalid input",
          debugId
        });
      }
      
      const { resumeContent, resumeFileName = "Manual Entry" } = validation.data;
      const analysis = await runResumeAnalysis(resumeContent, resumeFileName);

      const updatedProfile = await storage.updateProfile(req.user!.id, {
        resumeContent,
        resumeFileName,
        resumeAnalysis: analysis,
        summary: analysis.summary,
        skills: analysis.keySkills || [],
      });

      res.json({ 
        ok: true, 
        analysis,
        profile: updatedProfile,
        debugId
      });
    } catch (error: any) {
      next(error);
    }
  });

  // Stats
  app.get("/api/stats", isAuthenticated, async (req, res, next) => {
    try {
      const jobs = await storage.getJobs(req.user!.id);
      const applications = await storage.getApplications(req.user!.id);
      
      const stats = {
        totalJobs: jobs.length,
        applied: applications.length,
        interviews: applications.filter(a => a.status === "interviewing" || a.status === "offered").length,
        responseRate: jobs.length > 0 ? Math.round((applications.length / jobs.length) * 100) : 0,
        pendingActions: (await storage.getDailyActions(req.user!.id)).filter(a => !a.isCompleted).length,
      };
      
      res.json(stats);
    } catch (error) {
      next(error);
    }
  });

  // Jobs
  app.get("/api/jobs", isAuthenticated, async (req, res, next) => {
    try {
      const jobs = await storage.getJobs(req.user!.id);
      res.json(jobs);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/jobs", isAuthenticated, async (req, res, next) => {
    try {
      const validated = insertJobSchema.parse(req.body);
      const job = await storage.createJob({ ...validated, userId: req.user!.id });
      res.status(201).json(job);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/jobs/:id", isAuthenticated, async (req, res, next) => {
    try {
      const job = await storage.updateJob(parseInt(req.params.id), req.body);
      res.json(job);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/jobs/:id", isAuthenticated, async (req, res, next) => {
    try {
      await storage.deleteJob(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // AI-powered job search
  app.post("/api/jobs/search", isAuthenticated, async (req, res, next) => {
    try {
      const bodySchema = z.object({
        query: z.string().optional(),
        location: z.string().optional(),
      });
      const body = bodySchema.parse(req.body ?? {});
      const query = (body.query || "").trim();

      // De-dupe based on sourceUrl to avoid endless duplicates.
      const existing = await storage.getJobs(req.user!.id);
      const existingUrls = new Set(
        existing.map((j) => (j.sourceUrl || "").trim()).filter(Boolean),
      );

      // Prefer OpenAI if configured, but ALWAYS fall back to a no-key source.
      let candidateJobs: Array<{
        title: string;
        company: string;
        location: string;
        description?: string;
        salary?: string;
        source?: string;
        sourceUrl?: string;
        matchScore?: number;
        priority?: string;
      }> = [];

      if (hasOpenAIKeyConfigured()) {
        try {
          const profile = await storage.getProfile(req.user!.id);
          const prompt = `Search for jobs matching query: "${query || "operations manager business development"}".
Candidate Info: ${profile?.summary || RESUME_CONTEXT}
Return JSON: { "jobs": [{ "title": "...", "company": "...", "location": "...", "description": "...", "salary": "...", "matchScore": 0-100 }] }`;

          const completion = await getOpenAIClient().chat.completions.create({
            model: "gpt-4o",
            messages: [
              { role: "system", content: "You are an AI job search assistant. Return valid JSON only." },
              { role: "user", content: prompt },
            ],
            response_format: { type: "json_object" },
          });

          const content = completion.choices[0]?.message?.content;
          const parsed = JSON.parse(content || '{"jobs":[]}');
          candidateJobs = Array.isArray(parsed?.jobs) ? parsed.jobs : [];
        } catch {
          // swallow and fall back
        }
      }

      if (candidateJobs.length === 0) {
        const remotive = await fetchRemotiveJobs({ search: query || undefined });
        candidateJobs = remotive.slice(0, 30).map((j: any) => {
          const title = String(j?.title || "Untitled").trim();
          const company = String(j?.company_name || "Unknown").trim();
          const location = String(j?.candidate_required_location || "Remote").trim() || "Remote";
          const sourceUrl = String(j?.url || "").trim();
          const rawDesc = String(j?.description || "").trim();
          const description = stripHtml(rawDesc).slice(0, 5000);
          const salary = String(j?.salary || "").trim() || undefined;
          const matchScore = estimateMatchScore(title, description);
          const priority = scoreToPriority(matchScore);
          return {
            title,
            company,
            location,
            description,
            salary,
            matchScore,
            priority,
            source: "remotive",
            sourceUrl,
          };
        });
      }

      const createdJobs: any[] = [];
      for (const job of candidateJobs) {
        const url = (job.sourceUrl || "").trim();
        if (url && existingUrls.has(url)) continue;
        if (url) existingUrls.add(url);

        createdJobs.push(
          await storage.createJob({
            userId: req.user!.id,
            title: job.title,
            company: job.company,
            location: job.location,
            salary: job.salary,
            description: job.description,
            matchScore: job.matchScore ?? estimateMatchScore(job.title, job.description || ""),
            priority: job.priority ?? scoreToPriority(job.matchScore ?? 60),
            source: job.source ?? "search",
            sourceUrl: job.sourceUrl,
            isActive: true,
          } as any),
        );
      }

      res.json({ ok: true, created: createdJobs.length, jobs: createdJobs });
    } catch (error) {
      next(error);
    }
  });

  // Applications
  app.get("/api/applications", isAuthenticated, async (req, res, next) => {
    try {
      const applications = await storage.getApplications(req.user!.id);
      res.json(applications);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/applications", isAuthenticated, async (req, res, next) => {
    try {
      const validated = insertApplicationSchema.parse(req.body);
      const app = await storage.createApplication({ ...validated, userId: req.user!.id });
      res.status(201).json(app);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/applications/:id", isAuthenticated, async (req, res, next) => {
    try {
      const application = await storage.updateApplication(parseInt(req.params.id), req.body);
      res.json(application);
    } catch (error) {
      next(error);
    }
  });

  // Contacts
  app.get("/api/contacts", isAuthenticated, async (req, res, next) => {
    try {
      const contacts = await storage.getContacts(req.user!.id);
      res.json(contacts);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/contacts", isAuthenticated, async (req, res, next) => {
    try {
      const validated = insertContactSchema.parse(req.body);
      const contact = await storage.createContact({ ...validated, userId: req.user!.id });
      res.status(201).json(contact);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/contacts/:id", isAuthenticated, async (req, res, next) => {
    try {
      await storage.deleteContact(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // Mark contacts as "mutual" if they match companies you have jobs for.
  // (This is a lightweight heuristic; real LinkedIn/Facebook mutual graph access is restricted.)
  app.post("/api/contacts/find-mutuals", isAuthenticated, async (req, res, next) => {
    try {
      const jobs = await storage.getJobs(req.user!.id);
      const companies = new Set(
        jobs
          .map((j) => (j.company || "").toLowerCase().trim())
          .filter(Boolean),
      );

      const contacts = await storage.getContacts(req.user!.id);
      let updatedCount = 0;
      for (const c of contacts) {
        const company = (c.company || "").toLowerCase().trim();
        const isMutual = Boolean(company && companies.has(company));
        if (isMutual && !c.isMutualConnection) {
          await storage.updateContact(c.id, {
            isMutualConnection: true,
            mutualConnectionWith: c.company || null,
          } as any);
          updatedCount++;
        }
      }

      res.json({ ok: true, updated: updatedCount });
    } catch (error) {
      next(error);
    }
  });

  // Daily Actions
  app.get("/api/daily-actions", isAuthenticated, async (req, res, next) => {
    try {
      const actions = await storage.getDailyActions(req.user!.id);
      res.json(actions);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/daily-actions", isAuthenticated, async (req, res, next) => {
    try {
      const validated = insertDailyActionSchema.parse(req.body);
      const action = await storage.createDailyAction({ ...validated, userId: req.user!.id });
      res.status(201).json(action);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/daily-actions/generate", isAuthenticated, async (req, res, next) => {
    try {
      const now = new Date();
      let actions: Array<any> = [];

      if (hasOpenAIKeyConfigured()) {
        const completion = await getOpenAIClient().chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content:
                "Generate 3-5 daily job search actions for the user. Return valid JSON only: { \"actions\": [{ \"title\": \"...\", \"description\": \"...\", \"actionType\": \"apply|follow_up|network|research|call|email\", \"priority\": \"high|medium|low\" }] }",
            },
          ],
          response_format: { type: "json_object" },
        });
        const content = completion.choices[0]?.message?.content;
        const parsed = JSON.parse(content || '{"actions":[]}');
        actions = Array.isArray(parsed?.actions) ? parsed.actions : [];
      } else {
        actions = [
          {
            title: "Apply to 2 roles that match your target archetypes",
            description: "Pick high-match roles and submit tailored applications.",
            actionType: "apply",
            priority: "high",
          },
          {
            title: "Send 3 follow-up messages to recent applications",
            description: "Use a short, friendly follow-up template.",
            actionType: "follow_up",
            priority: "medium",
          },
          {
            title: "Add 2 new contacts to your network",
            description: "Recruiters, hiring managers, or warm leads.",
            actionType: "network",
            priority: "medium",
          },
        ];
      }

      const created: any[] = [];
      for (const a of actions) {
        const safe = insertDailyActionSchema.parse({
          title: String(a.title || "").slice(0, 300),
          description: a.description ? String(a.description).slice(0, 2000) : undefined,
          actionType: a.actionType || "research",
          priority: a.priority || "low",
          dueDate: now,
          isCompleted: false,
        });
        created.push(await storage.createDailyAction({ ...safe, userId: req.user!.id }));
      }

      res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/daily-actions/:id", isAuthenticated, async (req, res, next) => {
    try {
      const bodySchema = z.object({
        isCompleted: z.boolean().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        priority: z.enum(["high", "medium", "low"]).optional(),
        dueDate: z.coerce.date().optional(),
      });
      const body = bodySchema.parse(req.body ?? {});
      const action = await storage.updateDailyAction(parseInt(req.params.id), body as any);
      res.json(action);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/daily-actions/:id", isAuthenticated, async (req, res, next) => {
    try {
      await storage.deleteDailyAction(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // Scripts
  app.get("/api/scripts", isAuthenticated, async (req, res, next) => {
    try {
      const scripts = await storage.getScripts(req.user!.id);
      res.json(scripts);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/scripts/generate", isAuthenticated, async (req, res, next) => {
    try {
      const bodySchema = z.object({
        scriptType: z.string().optional(),
        type: z.string().optional(),
        jobId: z.number().int().optional(),
        targetJobId: z.number().int().optional(),
        customPrompt: z.string().optional(),
        recipientName: z.string().optional(),
        jobTitle: z.string().optional(),
        companyName: z.string().optional(),
      });
      const body = bodySchema.parse(req.body ?? {});

      const scriptType = (body.scriptType || body.type || "email").toString();
      const jobId = body.jobId ?? body.targetJobId;
      const job = typeof jobId === "number" ? await storage.getJob(jobId) : undefined;
      const profile = await storage.getProfile(req.user!.id);

      const jobTitle = body.jobTitle || job?.title || "the role";
      const companyName = body.companyName || job?.company || "the company";
      const recipientName = body.recipientName || "Hiring Team";

      const extra = body.customPrompt ? `\n\nExtra instructions:\n${body.customPrompt}` : "";
      const prompt = `Write a ${scriptType} outreach message to ${recipientName} about ${jobTitle} at ${companyName}.
Candidate context: ${profile?.summary || RESUME_CONTEXT}
Be concise, specific, and human. Avoid buzzwords.
Return JSON: { "content": "..." }${extra}`;

      let contentText = "";
      if (hasOpenAIKeyConfigured()) {
        const completion = await getOpenAIClient().chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "You are an expert outreach assistant. Return valid JSON only." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        });
        const content = completion.choices[0]?.message?.content;
        const parsed = JSON.parse(content || '{"content":""}');
        contentText = String(parsed?.content || "").trim();
      }

      if (!contentText) {
        // Fallback (no key): simple template.
        contentText = `Hi ${recipientName},\n\nI’m reaching out about the ${jobTitle} role at ${companyName}. I have a strong operations + sales background (multi-location retail ops, vendor coordination, and building new product lines), and I’d love to learn what you need most in this position.\n\nIf helpful, I can share a quick summary of relevant wins and why I’m a fit.\n\nBest,\nNed`;
      }

      const script = await storage.createScript({
        userId: req.user!.id,
        title: `${scriptType} - ${companyName}`.slice(0, 200),
        scriptType,
        content: contentText,
        targetJobId: job?.id ?? null,
      } as any);
      res.status(201).json(script);
    } catch (error) {
      next(error);
    }
  });

  // Email reply helper (used by Scripts tab)
  app.post("/api/emails/generate-reply", isAuthenticated, async (req, res, next) => {
    try {
      const schema = z.object({
        incomingEmail: z.string().min(10).max(20000),
        tone: z.enum(["professional", "friendly", "urgent"]).optional(),
      });
      const { incomingEmail, tone } = schema.parse(req.body ?? {});
      const profile = await storage.getProfile(req.user!.id);

      let reply = "";
      if (hasOpenAIKeyConfigured()) {
        const completion = await getOpenAIClient().chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content:
                "You write short, clear email replies for job search. Preserve any concrete questions and answer them. Return JSON only: {\"reply\":\"...\"}",
            },
            {
              role: "user",
              content: `Tone: ${tone || "professional"}\nCandidate: ${profile?.summary || RESUME_CONTEXT}\n\nIncoming email:\n${incomingEmail}`,
            },
          ],
          response_format: { type: "json_object" },
        });
        const content = completion.choices[0]?.message?.content;
        const parsed = JSON.parse(content || '{"reply":""}');
        reply = String(parsed?.reply || "").trim();
      }

      if (!reply) {
        reply = `Thanks for reaching out.\n\nHappy to share more details and answer any questions. I’m available this week and can adjust to your schedule. What times work best for you?\n\nBest,\nNed`;
      }

      res.json({ ok: true, reply });
    } catch (error) {
      next(error);
    }
  });

  // Profile
  app.get("/api/profile", isAuthenticated, async (req, res, next) => {
    try {
      const profile = await storage.getProfile(req.user!.id);
      res.json(profile);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/profile", isAuthenticated, async (req, res, next) => {
    try {
      const profile = await storage.updateProfile(req.user!.id, req.body);
      res.json(profile);
    } catch (error) {
      next(error);
    }
  });

  // Job Archetypes
  app.get("/api/job-archetypes", isAuthenticated, async (req, res, next) => {
    try {
      const archetypes = await storage.getJobArchetypes(req.user!.id);
      res.json(archetypes);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/job-archetypes", isAuthenticated, async (req, res, next) => {
    try {
      const validated = insertJobArchetypeSchema.parse(req.body);
      const archetype = await storage.createJobArchetype({ ...validated, userId: req.user!.id });
      res.status(201).json(archetype);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/job-archetypes/:id", isAuthenticated, async (req, res, next) => {
    try {
      const archetype = await storage.updateJobArchetype(parseInt(req.params.id), req.body);
      res.json(archetype);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/job-archetypes/:id", isAuthenticated, async (req, res, next) => {
    try {
      await storage.deleteJobArchetype(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // Interview Stories
  app.get("/api/interview-stories", isAuthenticated, async (req, res, next) => {
    try {
      const stories = await storage.getInterviewStories(req.user!.id);
      res.json(stories);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/interview-stories", isAuthenticated, async (req, res, next) => {
    try {
      const validated = insertInterviewStorySchema.parse(req.body);
      const story = await storage.createInterviewStory({ ...validated, userId: req.user!.id });
      res.status(201).json(story);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/interview-stories/:id", isAuthenticated, async (req, res, next) => {
    try {
      const story = await storage.updateInterviewStory(parseInt(req.params.id), req.body);
      res.json(story);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/interview-stories/:id", isAuthenticated, async (req, res, next) => {
    try {
      await storage.deleteInterviewStory(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/interview-stories/generate", isAuthenticated, async (req, res, next) => {
    try {
      const schema = z.object({
        storyType: z.string().min(1),
      });
      const { storyType } = schema.parse(req.body ?? {});
      const profile = await storage.getProfile(req.user!.id);

      let storyData: any = null;
      if (hasOpenAIKeyConfigured()) {
        const completion = await getOpenAIClient().chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content:
                "Generate a STAR interview story. Return valid JSON only: {\"title\":\"...\",\"storyType\":\"sales_win|turnaround|negotiation|scaling|leadership\",\"situation\":\"...\",\"task\":\"...\",\"action\":\"...\",\"result\":\"...\",\"metrics\":\"...\",\"applicableQuestions\":[\"...\"]}",
            },
            {
              role: "user",
              content: `Candidate context:\n${profile?.summary || RESUME_CONTEXT}\n\nStory type: ${storyType}`,
            },
          ],
          response_format: { type: "json_object" },
        });
        const content = completion.choices[0]?.message?.content;
        storyData = JSON.parse(content || "null");
      }

      if (!storyData) {
        storyData = {
          title: `Story: ${storyType}`,
          storyType,
          situation: "Describe the situation.",
          task: "What was required?",
          action: "What did you do?",
          result: "What happened as a result?",
          metrics: "",
          applicableQuestions: ["Tell me about a time you handled a challenge."],
        };
      }

      const validated = insertInterviewStorySchema.parse({
        title: storyData.title || `Story: ${storyType}`,
        storyType: storyData.storyType || storyType,
        situation: storyData.situation,
        task: storyData.task,
        action: storyData.action,
        result: storyData.result,
        metrics: storyData.metrics,
        applicableQuestions: storyData.applicableQuestions,
      });

      const created = await storage.createInterviewStory({ ...validated, userId: req.user!.id });
      res.status(201).json({ ok: true, story: created });
    } catch (e) {
      next(e);
    }
  });

  // Outreach Templates
  app.get("/api/outreach-templates", isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getOutreachTemplates(req.user!.id);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.post("/api/outreach-templates", isAuthenticated, async (req, res) => {
    try {
      const validated = insertOutreachTemplateSchema.parse(req.body);
      const template = await storage.createOutreachTemplate({ ...validated, userId: req.user!.id });
      res.status(201).json(template);
    } catch (error) {
      res.status(400).json({ error: "Invalid template data" });
    }
  });

  app.patch("/api/outreach-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const template = await storage.updateOutreachTemplate(parseInt(req.params.id), req.body);
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  app.delete("/api/outreach-templates/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteOutreachTemplate(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // External Accounts
  app.get("/api/external-accounts", isAuthenticated, async (req, res) => {
    try {
      const accounts = await storage.getExternalAccounts(req.user!.id);
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch accounts" });
    }
  });

  app.post("/api/external-accounts", isAuthenticated, async (req, res) => {
    try {
      const { platform, ...data } = req.body;
      const account = await storage.updateExternalAccount(req.user!.id, platform, data);
      res.status(201).json(account);
    } catch (error) {
      res.status(400).json({ error: "Invalid account data" });
    }
  });

  // OAuth connect flows (LinkedIn + Facebook)
  // Note: Many “connections/friends list” APIs are restricted; this stores login + basic profile.
  function getBaseUrl(req: Request) {
    const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    return `${proto}://${host}`;
  }

  app.get("/api/oauth/linkedin/start", isAuthenticated, async (req: any, res) => {
    const clientId = process.env.LINKEDIN_CLIENT_ID?.trim();
    const redirectUri =
      process.env.LINKEDIN_REDIRECT_URI?.trim() || `${getBaseUrl(req)}/api/oauth/linkedin/callback`;
    if (!clientId) return res.status(503).send("LinkedIn OAuth not configured (LINKEDIN_CLIENT_ID).");

    const state = crypto.randomBytes(16).toString("hex");
    req.session.oauth = { provider: "linkedin", state };

    const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    // OIDC-style scopes (recommended).
    url.searchParams.set("scope", "openid profile email");

    res.redirect(url.toString());
  });

  app.get("/api/oauth/linkedin/callback", isAuthenticated, async (req: any, res, next) => {
    try {
      const clientId = process.env.LINKEDIN_CLIENT_ID?.trim();
      const clientSecret = process.env.LINKEDIN_CLIENT_SECRET?.trim();
      const redirectUri =
        process.env.LINKEDIN_REDIRECT_URI?.trim() || `${getBaseUrl(req)}/api/oauth/linkedin/callback`;
      if (!clientId || !clientSecret) return res.status(503).send("LinkedIn OAuth not configured.");

      const code = String(req.query.code || "");
      const state = String(req.query.state || "");
      const sess = req.session?.oauth;
      if (!code || !state || !sess || sess.provider !== "linkedin" || sess.state !== state) {
        return res.status(400).send("Invalid OAuth state.");
      }

      const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        }).toString(),
      });
      const tokenJson: any = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok) {
        return res.status(400).send(`LinkedIn token exchange failed: ${JSON.stringify(tokenJson)}`);
      }

      const accessToken = String(tokenJson.access_token || "");
      const expiresIn = Number(tokenJson.expires_in || 0);

      // OIDC userinfo endpoint.
      const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const meJson: any = await meRes.json().catch(() => ({}));

      await storage.updateExternalAccount(req.user!.id, "linkedin", {
        isConnected: true,
        username: meJson?.email || meJson?.name || meJson?.sub || "LinkedIn",
        profileUrl: meJson?.profile || null,
        lastSyncedAt: new Date(),
        settings: {
          accessToken,
          expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null,
          profile: meJson,
        },
      } as any);

      req.session.oauth = null;
      res.redirect("/settings?connected=linkedin");
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/oauth/facebook/start", isAuthenticated, async (req: any, res) => {
    const appId = process.env.FACEBOOK_APP_ID?.trim();
    const redirectUri =
      process.env.FACEBOOK_REDIRECT_URI?.trim() || `${getBaseUrl(req)}/api/oauth/facebook/callback`;
    if (!appId) return res.status(503).send("Facebook OAuth not configured (FACEBOOK_APP_ID).");

    const state = crypto.randomBytes(16).toString("hex");
    req.session.oauth = { provider: "facebook", state };

    const url = new URL("https://www.facebook.com/v19.0/dialog/oauth");
    url.searchParams.set("client_id", appId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("scope", "public_profile,email");

    res.redirect(url.toString());
  });

  app.get("/api/oauth/facebook/callback", isAuthenticated, async (req: any, res, next) => {
    try {
      const appId = process.env.FACEBOOK_APP_ID?.trim();
      const appSecret = process.env.FACEBOOK_APP_SECRET?.trim();
      const redirectUri =
        process.env.FACEBOOK_REDIRECT_URI?.trim() || `${getBaseUrl(req)}/api/oauth/facebook/callback`;
      if (!appId || !appSecret) return res.status(503).send("Facebook OAuth not configured.");

      const code = String(req.query.code || "");
      const state = String(req.query.state || "");
      const sess = req.session?.oauth;
      if (!code || !state || !sess || sess.provider !== "facebook" || sess.state !== state) {
        return res.status(400).send("Invalid OAuth state.");
      }

      const tokenUrl = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
      tokenUrl.searchParams.set("client_id", appId);
      tokenUrl.searchParams.set("redirect_uri", redirectUri);
      tokenUrl.searchParams.set("client_secret", appSecret);
      tokenUrl.searchParams.set("code", code);

      const tokenRes = await fetch(tokenUrl.toString());
      const tokenJson: any = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok) {
        return res.status(400).send(`Facebook token exchange failed: ${JSON.stringify(tokenJson)}`);
      }

      const accessToken = String(tokenJson.access_token || "");
      const expiresIn = Number(tokenJson.expires_in || 0);

      const meUrl = new URL("https://graph.facebook.com/me");
      meUrl.searchParams.set("fields", "id,name,email,link");
      meUrl.searchParams.set("access_token", accessToken);
      const meRes = await fetch(meUrl.toString());
      const meJson: any = await meRes.json().catch(() => ({}));

      await storage.updateExternalAccount(req.user!.id, "facebook", {
        isConnected: true,
        username: meJson?.email || meJson?.name || meJson?.id || "Facebook",
        profileUrl: meJson?.link || null,
        lastSyncedAt: new Date(),
        settings: {
          accessToken,
          expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null,
          profile: meJson,
        },
      } as any);

      req.session.oauth = null;
      res.redirect("/settings?connected=facebook");
    } catch (e) {
      next(e);
    }
  });

  // Weekly Plans
  app.get("/api/weekly-plans", isAuthenticated, async (req, res) => {
    try {
      const plans = await storage.getWeeklyPlans(req.user!.id);
      res.json(plans);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch plans" });
    }
  });

  app.post("/api/weekly-plans/generate", isAuthenticated, async (req, res) => {
    try {
      let goals: string[] = [];
      let actions: string[] = [];

      if (hasOpenAIKeyConfigured()) {
        const completion = await getOpenAIClient().chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content:
                "Generate a weekly job search plan. Return valid JSON only: { \"goals\": [\"...\"], \"actions\": [\"...\"] }",
            },
          ],
          response_format: { type: "json_object" },
        });
        const content = completion.choices[0]?.message?.content;
        const parsed = JSON.parse(content || '{"goals":[], "actions":[]}');
        goals = Array.isArray(parsed?.goals) ? parsed.goals : [];
        actions = Array.isArray(parsed?.actions) ? parsed.actions : [];
      } else {
        goals = ["Apply to 10 roles", "Schedule 3 networking conversations"];
        actions = [
          "Run job search twice (Mon/Thu) and save top matches",
          "Send 5 outreach messages",
          "Follow up on all applications older than 5 business days",
        ];
      }

      const plan = await storage.createWeeklyPlan({
        userId: req.user!.id,
        weekStartDate: new Date(),
        goals: goals.slice(0, 12),
        notes: actions.length ? `Actions:\n- ${actions.slice(0, 20).join("\n- ")}` : undefined,
      } as any);

      res.status(201).json({ ok: true, plan, goals, actions });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate weekly plan" });
    }
  });

  // Calendar Events
  app.get("/api/calendar-events", isAuthenticated, async (req, res) => {
    try {
      const events = await storage.getCalendarEvents(req.user!.id);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch calendar events" });
    }
  });

  app.post("/api/calendar-events/auto-assign", isAuthenticated, async (req, res, next) => {
    try {
      const schema = z.object({
        jobId: z.number().int(),
        eventType: z.string().min(1),
        startTime: z.coerce.date(),
      });
      const { jobId, eventType, startTime } = schema.parse(req.body ?? {});
      const job = await storage.getJob(jobId);
      if (!job) return res.status(404).json({ error: "Job not found" });

      const titlePrefix =
        eventType === "follow_up"
          ? "Follow-up"
          : eventType === "deadline"
            ? "Deadline"
            : eventType === "networking"
              ? "Networking"
              : "Interview";

      const event = await storage.createCalendarEvent({
        userId: req.user!.id,
        title: `${titlePrefix}: ${job.title} @ ${job.company}`.slice(0, 250),
        eventType,
        startTime,
        description: job.sourceUrl ? `Job posting: ${job.sourceUrl}` : undefined,
        location: job.location,
        relatedJobId: job.id,
        reminderMinutes: 30,
      } as any);

      res.status(201).json({ ok: true, event });
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/calendar-events", isAuthenticated, async (req, res) => {
    try {
      const validated = insertCalendarEventSchema.parse(req.body);
      const event = await storage.createCalendarEvent({ ...validated, userId: req.user!.id });
      res.status(201).json(event);
    } catch (error) {
      res.status(400).json({ error: "Invalid event data" });
    }
  });

  app.patch("/api/calendar-events/:id", isAuthenticated, async (req, res) => {
    try {
      const event = await storage.updateCalendarEvent(parseInt(req.params.id), req.body);
      res.json(event);
    } catch (error) {
      res.status(500).json({ error: "Failed to update event" });
    }
  });

  app.delete("/api/calendar-events/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteCalendarEvent(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete event" });
    }
  });

  // Reminders for header
  app.get("/api/reminders", isAuthenticated, async (req, res) => {
    try {
      const events = await storage.getCalendarEvents(req.user!.id);
      const now = new Date();
      const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const upcomingReminders = events.filter(e => {
        const eventDate = new Date(e.startTime);
        return eventDate > now && eventDate < next24h;
      });
      
      res.json(upcomingReminders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reminders" });
    }
  });

  // AI Resume Revisions
  app.post("/api/profile/revise-resume", isAuthenticated, async (req, res) => {
    try {
      const { resumeContent, revisionType } = req.body;
      
      const prompts: Record<string, string> = {
        ats: "Optimize this resume for Applicant Tracking Systems (ATS). Focus on keywords, standard formatting, and clear experience descriptions.",
        results: "Revise this resume to be highly results-focused. Quantify achievements, use strong action verbs, and highlight impact.",
        executive: "Transform this resume into a high-level executive profile. Focus on leadership, strategic impact, and P&L responsibility.",
        concise: "Create a concise, one-page version of this resume. Keep the most impactful points and remove fluff.",
      };

      const completion = await getOpenAIClient().chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert resume writer. ${prompts[revisionType] || prompts.ats} Return valid JSON: { "revisedResume": "the full revised text" }`
          },
          {
            role: "user",
            content: `Original Resume:\n\n${resumeContent}`
          }
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      const parsed = JSON.parse(content || '{"revisedResume":""}');
      res.json({ revisedResume: parsed.revisedResume });
    } catch (error) {
      res.status(500).json({ error: "Failed to revise resume" });
    }
  });

  // Loop Watchdog Reporting
  app.post("/api/loop-watchdog", (req, res) => {
    console.warn("[FrontendLoopReport]", {
      ...req.body,
      ip: (req.headers["x-forwarded-for"] as string) || req.ip || "unknown",
    });
    res.status(204).end();
  });

  // JobTracker API surface (Prisma-backed, served directly by Express).
  registerJobtrackerApi(app);

  return;
}
