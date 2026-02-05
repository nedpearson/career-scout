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

  // AI-powered job search
  app.post("/api/jobs/search", isAuthenticated, async (req, res, next) => {
    try {
      const { query } = req.body;
      const profile = await storage.getProfile(req.user!.id);
      
      const prompt = `Search for jobs matching query: "${query}". 
      Candidate Info: ${profile?.summary || RESUME_CONTEXT}
      Return JSON: { "jobs": [{ "title": "...", "company": "...", "location": "...", "description": "...", "salary": "...", "matchScore": 0-100 }] }`;

      const completion = await getOpenAIClient().chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: "You are an AI job search assistant. Return valid JSON only." }, { role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      const parsed = JSON.parse(content || '{"jobs":[]}');
      
      const createdJobs = [];
      for (const job of parsed.jobs) {
        createdJobs.push(await storage.createJob({
          ...job,
          userId: req.user!.id,
          isActive: true,
          discoveredAt: new Date(),
        }));
      }
      
      res.json(createdJobs);
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

  // Daily Actions
  app.get("/api/daily-actions", isAuthenticated, async (req, res, next) => {
    try {
      const actions = await storage.getDailyActions(req.user!.id);
      res.json(actions);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/daily-actions/generate", isAuthenticated, async (req, res, next) => {
    try {
      const completion = await getOpenAIClient().chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: "Generate 3-5 daily job search actions for the user. Return JSON: { \"actions\": [{ \"title\": \"...\", \"priority\": \"high|medium|low\" }] }" }],
        response_format: { type: "json_object" },
      });
      const content = completion.choices[0]?.message?.content;
      const parsed = JSON.parse(content || '{"actions":[]}');
      
      const created = [];
      for (const action of parsed.actions) {
        created.push(await storage.createDailyAction({
          ...action,
          userId: req.user!.id,
          completed: false,
          dueDate: new Date(),
        }));
      }
      res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/daily-actions/:id", isAuthenticated, async (req, res, next) => {
    try {
      const action = await storage.updateDailyAction(parseInt(req.params.id), req.body.completed);
      res.json(action);
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
      const { type, recipientName, jobTitle, companyName } = req.body;
      const prompt = `Generate a ${type} outreach script for ${recipientName} regarding the ${jobTitle} role at ${companyName}. Return JSON: { \"subject\": \"...\", \"content\": \"...\" }`;

      const completion = await getOpenAIClient().chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: "You are an expert outreach assistant. Return valid JSON only." }, { role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      const parsed = JSON.parse(content || '{"subject":"","content":""}');
      const script = await storage.createScript({
        userId: req.user!.id,
        title: `${type} for ${companyName}`,
        scriptType: type,
        content: parsed.content,
        targetJobId: null,
      });
      res.status(201).json(script);
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
      const completion = await getOpenAIClient().chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Generate a weekly job search plan for the candidate. Return valid JSON only: { \"goals\": [\"goal1\", \"goal2\"], \"actions\": [\"action1\", \"action2\"] }"
          }
        ],
        response_format: { type: "json_object" },
      });
      const content = completion.choices[0]?.message?.content;
      const parsed = JSON.parse(content || '{"goals":[], "actions":[]}');
      const plan = await storage.createWeeklyPlan({
        userId: req.user!.id,
        weekStartDate: new Date(),
        goals: parsed.goals,
        actions: parsed.actions,
        status: "active",
      } as any);
      res.status(201).json(plan);
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
