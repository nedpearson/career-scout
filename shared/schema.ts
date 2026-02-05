import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Re-export chat models for AI integration
export * from "./models/chat";

// Users table - must be defined first for foreign key references
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Jobs table - stores discovered job opportunities
export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull(),
  salary: text("salary"),
  description: text("description"),
  requirements: text("requirements"),
  matchScore: integer("match_score").default(0),
  priority: text("priority").default("medium"), // high, medium, low
  source: text("source"), // indeed, linkedin, company website, etc.
  sourceUrl: text("source_url"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  contactLinkedIn: text("contact_linkedin"),
  resumeVersion: text("resume_version"), // operations, business_development, sales_remote
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  discoveredAt: timestamp("discovered_at").default(sql`CURRENT_TIMESTAMP`),
});

// Applications table - tracks application status
export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  jobId: integer("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  status: text("status").default("pending"), // pending, applied, interviewing, offered, rejected, withdrawn
  appliedAt: timestamp("applied_at"),
  followUpDate: timestamp("follow_up_date"),
  interviewDate: timestamp("interview_date"),
  notes: text("notes"),
  responseReceived: boolean("response_received").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Contacts/Network table - tracks professional connections
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(),
  company: text("company"),
  title: text("title"),
  email: text("email"),
  phone: text("phone"),
  linkedIn: text("linkedin"),
  relationship: text("relationship"), // former colleague, vendor, alumni, mutual friend, recruiter, linkedin, facebook
  source: text("source"), // linkedin_import, facebook_import, manual, ai_discovered
  isMutualConnection: boolean("is_mutual_connection").default(false),
  mutualConnectionWith: text("mutual_connection_with"),
  notes: text("notes"),
  lastContactedAt: timestamp("last_contacted_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Daily actions table - tracks daily to-do items
export const dailyActions = pgTable("daily_actions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  actionType: text("action_type").notNull(), // apply, follow_up, network, research, call, email
  priority: text("priority").default("medium"), // high, medium, low
  relatedJobId: integer("related_job_id").references(() => jobs.id),
  relatedContactId: integer("related_contact_id").references(() => contacts.id),
  dueDate: timestamp("due_date"),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Scripts table - stores generated outreach scripts
export const scripts = pgTable("scripts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  title: text("title").notNull(),
  scriptType: text("script_type").notNull(), // email, linkedin_dm, phone, follow_up, thank_you
  targetJobId: integer("target_job_id").references(() => jobs.id),
  targetContactId: integer("target_contact_id").references(() => contacts.id),
  content: text("content").notNull(),
  isTemplate: boolean("is_template").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Resume profile - stores candidate information
export const resumeProfile = pgTable("resume_profile", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  location: text("location"),
  summary: text("summary"),
  highlights: jsonb("highlights").$type<string[]>(),
  skills: jsonb("skills").$type<string[]>(),
  experience: jsonb("experience").$type<{
    title: string;
    company: string;
    location: string;
    dates: string;
    bullets: string[];
  }[]>(),
  education: jsonb("education").$type<{
    school: string;
    degree: string;
    dates: string;
  }[]>(),
  targetRoles: jsonb("target_roles").$type<string[]>(),
  targetLocation: text("target_location"),
  salaryExpectation: text("salary_expectation"),
  resumeFileUrl: text("resume_file_url"),
  resumeFileName: text("resume_file_name"),
  resumeContent: text("resume_content"),
  resumeAnalysis: jsonb("resume_analysis").$type<{
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    keySkills: string[];
    experienceLevel: string;
    industryFocus: string[];
    overallScore: number;
  }>(),
  resumeUploadedAt: timestamp("resume_uploaded_at"),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Search history - tracks job searches performed
export const searchHistory = pgTable("search_history", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  query: text("query").notNull(),
  location: text("location"),
  resultsCount: integer("results_count").default(0),
  newJobsFound: integer("new_jobs_found").default(0),
  searchedAt: timestamp("searched_at").default(sql`CURRENT_TIMESTAMP`),
});

// Job archetypes - defines target job categories
export const jobArchetypes = pgTable("job_archetypes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  whyItFits: text("why_it_fits"),
  typicalTitles: jsonb("typical_titles").$type<string[]>(),
  seniorityLevel: text("seniority_level"), // senior, director, vp, manager
  compensationRange: text("compensation_range"),
  recommendedResume: text("recommended_resume"), // operations, business_development, sales_remote
  targetSummary: text("target_summary"),
  keyBullets: jsonb("key_bullets").$type<string[]>(),
  atsKeywords: jsonb("ats_keywords").$type<string[]>(),
  searchStrings: jsonb("search_strings").$type<{
    linkedin: string;
    indeed: string;
    google: string;
  }>(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Interview stories - prepared story frameworks for interviews
export const interviewStories = pgTable("interview_stories", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  title: text("title").notNull(),
  storyType: text("story_type").notNull(), // sales_win, turnaround, negotiation, scaling, leadership
  situation: text("situation"),
  task: text("task"),
  action: text("action"),
  result: text("result"),
  metrics: text("metrics"),
  applicableQuestions: jsonb("applicable_questions").$type<string[]>(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Outreach templates - reusable message templates
export const outreachTemplates = pgTable("outreach_templates", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(),
  templateType: text("template_type").notNull(), // linkedin_dm, recruiter_email, hiring_manager, follow_up, thank_you
  subject: text("subject"),
  content: text("content").notNull(),
  variables: jsonb("variables").$type<string[]>(), // placeholders like {company_name}, {role_title}
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// External accounts - LinkedIn/Indeed connection info
export const externalAccounts = pgTable("external_accounts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  platform: text("platform").notNull(), // linkedin, indeed, glassdoor
  profileUrl: text("profile_url"),
  username: text("username"),
  isConnected: boolean("is_connected").default(false),
  lastSyncedAt: timestamp("last_synced_at"),
  settings: jsonb("settings").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Calendar events - interviews, follow-ups, meetings
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  title: text("title").notNull(),
  eventType: text("event_type").notNull(), // interview, follow_up, networking, deadline, reminder
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  location: text("location"), // physical address or Zoom link
  relatedJobId: integer("related_job_id").references(() => jobs.id),
  relatedContactId: integer("related_contact_id").references(() => contacts.id),
  reminderMinutes: integer("reminder_minutes").default(30), // 15, 30, 60, 1440 (1 day)
  reminderSent: boolean("reminder_sent").default(false),
  isCompleted: boolean("is_completed").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Weekly plans - structured weekly execution plans
export const weeklyPlans = pgTable("weekly_plans", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  weekStartDate: timestamp("week_start_date").notNull(),
  goals: jsonb("goals").$type<string[]>(),
  targetApplications: integer("target_applications").default(10),
  targetNetworkingContacts: integer("target_networking_contacts").default(5),
  focusArchetypes: jsonb("focus_archetypes").$type<number[]>(), // archetype IDs
  geographicFocus: text("geographic_focus"), // baton_rouge, louisiana_texas, remote
  notes: text("notes"),
  completedApplications: integer("completed_applications").default(0),
  completedNetworking: integer("completed_networking").default(0),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Define relations
export const jobsRelations = relations(jobs, ({ many }) => ({
  applications: many(applications),
  dailyActions: many(dailyActions),
  scripts: many(scripts),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  job: one(jobs, {
    fields: [applications.jobId],
    references: [jobs.id],
  }),
}));

export const contactsRelations = relations(contacts, ({ many }) => ({
  dailyActions: many(dailyActions),
  scripts: many(scripts),
}));

export const dailyActionsRelations = relations(dailyActions, ({ one }) => ({
  job: one(jobs, {
    fields: [dailyActions.relatedJobId],
    references: [jobs.id],
  }),
  contact: one(contacts, {
    fields: [dailyActions.relatedContactId],
    references: [contacts.id],
  }),
}));

export const scriptsRelations = relations(scripts, ({ one }) => ({
  job: one(jobs, {
    fields: [scripts.targetJobId],
    references: [jobs.id],
  }),
  contact: one(contacts, {
    fields: [scripts.targetContactId],
    references: [contacts.id],
  }),
}));

// Insert schemas
export const insertJobSchema = createInsertSchema(jobs).omit({ id: true, discoveredAt: true });
export const insertApplicationSchema = createInsertSchema(applications).omit({ id: true, createdAt: true });
export const insertContactSchema = createInsertSchema(contacts).omit({ id: true, createdAt: true });
export const insertDailyActionSchema = createInsertSchema(dailyActions).omit({ id: true, createdAt: true });
export const insertScriptSchema = createInsertSchema(scripts).omit({ id: true, createdAt: true });
export const insertResumeProfileSchema = createInsertSchema(resumeProfile).omit({ id: true, updatedAt: true });
export const insertSearchHistorySchema = createInsertSchema(searchHistory).omit({ id: true, searchedAt: true });
export const insertJobArchetypeSchema = createInsertSchema(jobArchetypes).omit({ id: true, createdAt: true });
export const insertInterviewStorySchema = createInsertSchema(interviewStories).omit({ id: true, createdAt: true });
export const insertOutreachTemplateSchema = createInsertSchema(outreachTemplates).omit({ id: true, createdAt: true });
export const insertExternalAccountSchema = createInsertSchema(externalAccounts).omit({ id: true, createdAt: true });
export const insertWeeklyPlanSchema = createInsertSchema(weeklyPlans).omit({ id: true, createdAt: true });
export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({ id: true, createdAt: true });

// Types
export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type DailyAction = typeof dailyActions.$inferSelect;
export type InsertDailyAction = z.infer<typeof insertDailyActionSchema>;
export type Script = typeof scripts.$inferSelect;
export type InsertScript = z.infer<typeof insertScriptSchema>;
export type ResumeProfile = typeof resumeProfile.$inferSelect;
export type InsertResumeProfile = z.infer<typeof insertResumeProfileSchema>;
export type SearchHistory = typeof searchHistory.$inferSelect;
export type InsertSearchHistory = z.infer<typeof insertSearchHistorySchema>;
export type JobArchetype = typeof jobArchetypes.$inferSelect;
export type InsertJobArchetype = z.infer<typeof insertJobArchetypeSchema>;
export type InterviewStory = typeof interviewStories.$inferSelect;
export type InsertInterviewStory = z.infer<typeof insertInterviewStorySchema>;
export type OutreachTemplate = typeof outreachTemplates.$inferSelect;
export type InsertOutreachTemplate = z.infer<typeof insertOutreachTemplateSchema>;
export type ExternalAccount = typeof externalAccounts.$inferSelect;
export type InsertExternalAccount = z.infer<typeof insertExternalAccountSchema>;
export type WeeklyPlan = typeof weeklyPlans.$inferSelect;
export type InsertWeeklyPlan = z.infer<typeof insertWeeklyPlanSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;

