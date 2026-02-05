import { 
  users,
  jobs, 
  applications, 
  contacts, 
  dailyActions, 
  scripts, 
  resumeProfile, 
  searchHistory,
  jobArchetypes,
  interviewStories,
  outreachTemplates,
  externalAccounts,
  weeklyPlans,
  calendarEvents,
  type User,
  type InsertUser,
  type Job, 
  type InsertJob, 
  type Application, 
  type InsertApplication,
  type Contact,
  type InsertContact,
  type DailyAction,
  type InsertDailyAction,
  type Script,
  type InsertScript,
  type ResumeProfile,
  type InsertResumeProfile,
  type SearchHistory,
  type InsertSearchHistory,
  type JobArchetype,
  type InsertJobArchetype,
  type InterviewStory,
  type InsertInterviewStory,
  type OutreachTemplate,
  type InsertOutreachTemplate,
  type ExternalAccount,
  type InsertExternalAccount,
  type WeeklyPlan,
  type InsertWeeklyPlan,
  type CalendarEvent,
  type InsertCalendarEvent,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, isNull, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Jobs
  getJobs(userId: string): Promise<Job[]>;
  getJob(id: number): Promise<Job | undefined>;
  createJob(job: InsertJob & { userId: string }): Promise<Job>;
  updateJob(id: number, job: Partial<InsertJob>): Promise<Job | undefined>;
  deleteJob(id: number): Promise<void>;

  // Applications
  getApplications(userId: string): Promise<(Application & { job?: Job })[]>;
  getApplication(id: number): Promise<Application | undefined>;
  createApplication(application: InsertApplication & { userId: string }): Promise<Application>;
  updateApplication(id: number, application: Partial<InsertApplication>): Promise<Application | undefined>;

  // Contacts
  getContacts(userId: string): Promise<Contact[]>;
  getContact(id: number): Promise<Contact | undefined>;
  createContact(contact: InsertContact & { userId: string }): Promise<Contact>;
  updateContact(id: number, contact: Partial<InsertContact>): Promise<Contact | undefined>;
  deleteContact(id: number): Promise<void>;

  // Daily Actions
  getDailyActions(userId: string): Promise<DailyAction[]>;
  getDailyAction(id: number): Promise<DailyAction | undefined>;
  createDailyAction(action: InsertDailyAction & { userId: string }): Promise<DailyAction>;
  updateDailyAction(id: number, action: Partial<InsertDailyAction>): Promise<DailyAction | undefined>;
  deleteDailyAction(id: number): Promise<void>;
  deleteAllDailyActions(userId: string): Promise<void>;

  // Scripts
  getScripts(userId: string): Promise<Script[]>;
  getScript(id: number): Promise<Script | undefined>;
  createScript(script: InsertScript & { userId: string }): Promise<Script>;
  updateScript(id: number, script: Partial<InsertScript>): Promise<Script | undefined>;

  // Resume Profile
  getProfile(userId: string): Promise<ResumeProfile | undefined>;
  updateProfile(userId: string, profile: Partial<InsertResumeProfile>): Promise<ResumeProfile>;

  // Search History
  addSearchHistory(search: InsertSearchHistory & { userId: string }): Promise<SearchHistory>;

  // Stats
  getStats(userId: string): Promise<{
    totalJobs: number;
    applied: number;
    interviews: number;
    responseRate: number;
    pendingActions: number;
  }>;

  // Job Archetypes
  getJobArchetypes(userId: string): Promise<JobArchetype[]>;
  getJobArchetype(id: number): Promise<JobArchetype | undefined>;
  createJobArchetype(archetype: InsertJobArchetype & { userId: string }): Promise<JobArchetype>;
  updateJobArchetype(id: number, archetype: Partial<InsertJobArchetype>): Promise<JobArchetype | undefined>;
  deleteJobArchetype(id: number): Promise<void>;

  // Interview Stories
  getInterviewStories(userId: string): Promise<InterviewStory[]>;
  getInterviewStory(id: number): Promise<InterviewStory | undefined>;
  createInterviewStory(story: InsertInterviewStory & { userId: string }): Promise<InterviewStory>;
  updateInterviewStory(id: number, story: Partial<InsertInterviewStory>): Promise<InterviewStory | undefined>;
  deleteInterviewStory(id: number): Promise<void>;

  // Outreach Templates
  getOutreachTemplates(userId: string): Promise<OutreachTemplate[]>;
  getOutreachTemplate(id: number): Promise<OutreachTemplate | undefined>;
  createOutreachTemplate(template: InsertOutreachTemplate & { userId: string }): Promise<OutreachTemplate>;
  updateOutreachTemplate(id: number, template: Partial<InsertOutreachTemplate>): Promise<OutreachTemplate | undefined>;
  deleteOutreachTemplate(id: number): Promise<void>;

  // Weekly Plans
  getWeeklyPlans(userId: string): Promise<WeeklyPlan[]>;
  getCurrentWeeklyPlan(userId: string): Promise<WeeklyPlan | undefined>;
  createWeeklyPlan(plan: InsertWeeklyPlan & { userId: string }): Promise<WeeklyPlan>;
  updateWeeklyPlan(id: number, plan: Partial<InsertWeeklyPlan>): Promise<WeeklyPlan | undefined>;

  // External Accounts
  getExternalAccounts(userId: string): Promise<ExternalAccount[]>;
  updateExternalAccount(userId: string, platform: string, account: Partial<InsertExternalAccount>): Promise<ExternalAccount>;

  // Calendar Events
  getCalendarEvents(userId: string): Promise<CalendarEvent[]>;
  getCalendarEvent(id: number): Promise<CalendarEvent | undefined>;
  createCalendarEvent(event: InsertCalendarEvent & { userId: string }): Promise<CalendarEvent>;
  updateCalendarEvent(id: number, event: Partial<InsertCalendarEvent>): Promise<CalendarEvent | undefined>;
  deleteCalendarEvent(id: number): Promise<void>;
  getUpcomingReminders(userId: string): Promise<CalendarEvent[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Jobs
  async getJobs(userId: string): Promise<Job[]> {
    return db.select().from(jobs).where(eq(jobs.userId, userId)).orderBy(desc(jobs.matchScore), desc(jobs.discoveredAt));
  }

  async getJob(id: number): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job;
  }

  async createJob(job: InsertJob & { userId: string }): Promise<Job> {
    const [newJob] = await db.insert(jobs).values(job).returning();
    return newJob;
  }

  async updateJob(id: number, job: Partial<InsertJob>): Promise<Job | undefined> {
    const [updated] = await db.update(jobs).set(job).where(eq(jobs.id, id)).returning();
    return updated;
  }

  async deleteJob(id: number): Promise<void> {
    await db.delete(jobs).where(eq(jobs.id, id));
  }

  // Applications
  async getApplications(userId: string): Promise<(Application & { job?: Job })[]> {
    const result = await db
      .select()
      .from(applications)
      .where(eq(applications.userId, userId))
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .orderBy(desc(applications.createdAt));
    
    return result.map((r: any) => ({
      ...r.applications,
      job: r.jobs || undefined,
    }));
  }

  async getApplication(id: number): Promise<Application | undefined> {
    const [app] = await db.select().from(applications).where(eq(applications.id, id));
    return app;
  }

  async createApplication(application: InsertApplication & { userId: string }): Promise<Application> {
    const [newApp] = await db.insert(applications).values({
      ...application,
      appliedAt: new Date(),
    }).returning();
    return newApp;
  }

  async updateApplication(id: number, application: Partial<InsertApplication>): Promise<Application | undefined> {
    const [updated] = await db.update(applications).set(application).where(eq(applications.id, id)).returning();
    return updated;
  }

  // Contacts
  async getContacts(userId: string): Promise<Contact[]> {
    return db.select().from(contacts).where(eq(contacts.userId, userId)).orderBy(desc(contacts.createdAt));
  }

  async getContact(id: number): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact;
  }

  async createContact(contact: InsertContact & { userId: string }): Promise<Contact> {
    const [newContact] = await db.insert(contacts).values(contact).returning();
    return newContact;
  }

  async updateContact(id: number, contact: Partial<InsertContact>): Promise<Contact | undefined> {
    const [updated] = await db.update(contacts).set(contact).where(eq(contacts.id, id)).returning();
    return updated;
  }

  async deleteContact(id: number): Promise<void> {
    await db.delete(contacts).where(eq(contacts.id, id));
  }

  // Daily Actions
  async getDailyActions(userId: string): Promise<DailyAction[]> {
    return db.select().from(dailyActions).where(eq(dailyActions.userId, userId)).orderBy(
      sql`CASE WHEN ${dailyActions.priority} = 'high' THEN 1 WHEN ${dailyActions.priority} = 'medium' THEN 2 ELSE 3 END`,
      desc(dailyActions.createdAt)
    );
  }

  async getDailyAction(id: number): Promise<DailyAction | undefined> {
    const [action] = await db.select().from(dailyActions).where(eq(dailyActions.id, id));
    return action;
  }

  async createDailyAction(action: InsertDailyAction & { userId: string }): Promise<DailyAction> {
    const [newAction] = await db.insert(dailyActions).values(action).returning();
    return newAction;
  }

  async updateDailyAction(id: number, action: Partial<InsertDailyAction>): Promise<DailyAction | undefined> {
    const updateData: any = { ...action };
    if (action.isCompleted) {
      updateData.completedAt = new Date();
    }
    const [updated] = await db.update(dailyActions).set(updateData).where(eq(dailyActions.id, id)).returning();
    return updated;
  }

  async deleteDailyAction(id: number): Promise<void> {
    await db.delete(dailyActions).where(eq(dailyActions.id, id));
  }

  async deleteAllDailyActions(userId: string): Promise<void> {
    await db.delete(dailyActions).where(eq(dailyActions.userId, userId));
  }

  // Scripts
  async getScripts(userId: string): Promise<Script[]> {
    return db.select().from(scripts).where(eq(scripts.userId, userId)).orderBy(desc(scripts.createdAt));
  }

  async getScript(id: number): Promise<Script | undefined> {
    const [script] = await db.select().from(scripts).where(eq(scripts.id, id));
    return script;
  }

  async createScript(script: InsertScript & { userId: string }): Promise<Script> {
    const [newScript] = await db.insert(scripts).values(script).returning();
    return newScript;
  }

  async updateScript(id: number, script: Partial<InsertScript>): Promise<Script | undefined> {
    const [updated] = await db.update(scripts).set(script).where(eq(scripts.id, id)).returning();
    return updated;
  }

  // Resume Profile
  async getProfile(userId: string): Promise<ResumeProfile | undefined> {
    const [profile] = await db.select().from(resumeProfile).where(eq(resumeProfile.userId, userId)).limit(1);
    return profile;
  }

  async updateProfile(userId: string, profile: Partial<InsertResumeProfile>): Promise<ResumeProfile> {
    const existing = await this.getProfile(userId);
    if (existing) {
      const [updated] = await db.update(resumeProfile).set({
        ...profile,
        updatedAt: new Date(),
      }).where(eq(resumeProfile.id, existing.id)).returning();
      return updated;
    } else {
      const [created] = await db.insert(resumeProfile).values({
        name: profile.name || "Ned Pearson",
        userId,
        ...profile,
      }).returning();
      return created;
    }
  }

  // Search History
  async addSearchHistory(search: InsertSearchHistory & { userId: string }): Promise<SearchHistory> {
    const [newSearch] = await db.insert(searchHistory).values(search).returning();
    return newSearch;
  }

  // Stats
  async getStats(userId: string): Promise<{
    totalJobs: number;
    applied: number;
    interviews: number;
    responseRate: number;
    pendingActions: number;
  }> {
    const allJobs = await db.select().from(jobs).where(and(eq(jobs.userId, userId), eq(jobs.isActive, true)));
    const allApps = await db.select().from(applications).where(eq(applications.userId, userId));
    const allActions = await db.select().from(dailyActions).where(and(eq(dailyActions.userId, userId), eq(dailyActions.isCompleted, false)));

    const appliedCount = allApps.filter((a: any) => a.status === "applied" || a.status === "interviewing" || a.status === "offered").length;
    const interviewCount = allApps.filter((a: any) => a.status === "interviewing").length;
    const responseCount = allApps.filter((a: any) => a.responseReceived).length;
    const responseRate = appliedCount > 0 ? Math.round((responseCount / appliedCount) * 100) : 0;

    return {
      totalJobs: allJobs.length,
      applied: appliedCount,
      interviews: interviewCount,
      responseRate,
      pendingActions: allActions.length,
    };
  }

  // Job Archetypes
  async getJobArchetypes(userId: string): Promise<JobArchetype[]> {
    return db.select().from(jobArchetypes).where(eq(jobArchetypes.userId, userId)).orderBy(desc(jobArchetypes.createdAt));
  }

  async getJobArchetype(id: number): Promise<JobArchetype | undefined> {
    const [archetype] = await db.select().from(jobArchetypes).where(eq(jobArchetypes.id, id));
    return archetype;
  }

  async createJobArchetype(archetype: InsertJobArchetype & { userId: string }): Promise<JobArchetype> {
    const [newArchetype] = await db.insert(jobArchetypes).values(archetype).returning();
    return newArchetype;
  }

  async updateJobArchetype(id: number, archetype: Partial<InsertJobArchetype>): Promise<JobArchetype | undefined> {
    const [updated] = await db.update(jobArchetypes).set(archetype).where(eq(jobArchetypes.id, id)).returning();
    return updated;
  }

  async deleteJobArchetype(id: number): Promise<void> {
    await db.delete(jobArchetypes).where(eq(jobArchetypes.id, id));
  }

  // Interview Stories
  async getInterviewStories(userId: string): Promise<InterviewStory[]> {
    return db.select().from(interviewStories).where(eq(interviewStories.userId, userId)).orderBy(desc(interviewStories.createdAt));
  }

  async getInterviewStory(id: number): Promise<InterviewStory | undefined> {
    const [story] = await db.select().from(interviewStories).where(eq(interviewStories.id, id));
    return story;
  }

  async createInterviewStory(story: InsertInterviewStory & { userId: string }): Promise<InterviewStory> {
    const [newStory] = await db.insert(interviewStories).values(story).returning();
    return newStory;
  }

  async updateInterviewStory(id: number, story: Partial<InsertInterviewStory>): Promise<InterviewStory | undefined> {
    const [updated] = await db.update(interviewStories).set(story).where(eq(interviewStories.id, id)).returning();
    return updated;
  }

  async deleteInterviewStory(id: number): Promise<void> {
    await db.delete(interviewStories).where(eq(interviewStories.id, id));
  }

  // Outreach Templates
  async getOutreachTemplates(userId: string): Promise<OutreachTemplate[]> {
    return db.select().from(outreachTemplates).where(eq(outreachTemplates.userId, userId)).orderBy(desc(outreachTemplates.createdAt));
  }

  async getOutreachTemplate(id: number): Promise<OutreachTemplate | undefined> {
    const [template] = await db.select().from(outreachTemplates).where(eq(outreachTemplates.id, id));
    return template;
  }

  async createOutreachTemplate(template: InsertOutreachTemplate & { userId: string }): Promise<OutreachTemplate> {
    const [newTemplate] = await db.insert(outreachTemplates).values(template).returning();
    return newTemplate;
  }

  async updateOutreachTemplate(id: number, template: Partial<InsertOutreachTemplate>): Promise<OutreachTemplate | undefined> {
    const [updated] = await db.update(outreachTemplates).set(template).where(eq(outreachTemplates.id, id)).returning();
    return updated;
  }

  async deleteOutreachTemplate(id: number): Promise<void> {
    await db.delete(outreachTemplates).where(eq(outreachTemplates.id, id));
  }

  // Weekly Plans
  async getWeeklyPlans(userId: string): Promise<WeeklyPlan[]> {
    return db.select().from(weeklyPlans).where(eq(weeklyPlans.userId, userId)).orderBy(desc(weeklyPlans.weekStartDate));
  }

  async getCurrentWeeklyPlan(userId: string): Promise<WeeklyPlan | undefined> {
    const [plan] = await db.select().from(weeklyPlans)
      .where(eq(weeklyPlans.userId, userId))
      .orderBy(desc(weeklyPlans.weekStartDate))
      .limit(1);
    return plan;
  }

  async createWeeklyPlan(plan: InsertWeeklyPlan & { userId: string }): Promise<WeeklyPlan> {
    const [newPlan] = await db.insert(weeklyPlans).values(plan).returning();
    return newPlan;
  }

  async updateWeeklyPlan(id: number, plan: Partial<InsertWeeklyPlan>): Promise<WeeklyPlan | undefined> {
    const [updated] = await db.update(weeklyPlans).set(plan).where(eq(weeklyPlans.id, id)).returning();
    return updated;
  }

  // External Accounts
  async getExternalAccounts(userId: string): Promise<ExternalAccount[]> {
    return db.select().from(externalAccounts).where(eq(externalAccounts.userId, userId));
  }

  async updateExternalAccount(userId: string, platform: string, account: Partial<InsertExternalAccount>): Promise<ExternalAccount> {
    const [existing] = await db.select().from(externalAccounts).where(and(eq(externalAccounts.userId, userId), eq(externalAccounts.platform, platform)));
    
    if (existing) {
      const [updated] = await db.update(externalAccounts)
        .set({ ...account, lastSyncedAt: new Date() })
        .where(eq(externalAccounts.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(externalAccounts)
        .values({
          userId,
          platform,
          isConnected: account.isConnected ?? false,
          profileUrl: account.profileUrl,
          username: account.username,
        })
        .returning();
      return created;
    }
  }

  // Calendar Events
  async getCalendarEvents(userId: string): Promise<CalendarEvent[]> {
    return db.select().from(calendarEvents).where(eq(calendarEvents.userId, userId)).orderBy(desc(calendarEvents.startTime));
  }

  async getCalendarEvent(id: number): Promise<CalendarEvent | undefined> {
    const [event] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id));
    return event;
  }

  async createCalendarEvent(event: InsertCalendarEvent & { userId: string }): Promise<CalendarEvent> {
    const [newEvent] = await db.insert(calendarEvents).values(event).returning();
    return newEvent;
  }

  async updateCalendarEvent(id: number, event: Partial<InsertCalendarEvent>): Promise<CalendarEvent | undefined> {
    const [updated] = await db.update(calendarEvents).set(event).where(eq(calendarEvents.id, id)).returning();
    return updated;
  }

  async deleteCalendarEvent(id: number): Promise<void> {
    await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
  }

  async getUpcomingReminders(userId: string): Promise<CalendarEvent[]> {
    const now = new Date();
    const events = await db.select().from(calendarEvents)
      .where(and(
        eq(calendarEvents.userId, userId),
        eq(calendarEvents.isCompleted, false),
        eq(calendarEvents.reminderSent, false)
      ))
      .orderBy(calendarEvents.startTime);
    
    return events.filter((event: any) => {
      const reminderTime = new Date(event.startTime);
      reminderTime.setMinutes(reminderTime.getMinutes() - (event.reminderMinutes || 30));
      return reminderTime <= now && new Date(event.startTime) > now;
    });
  }
}

export const storage = new DatabaseStorage();
