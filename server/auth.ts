import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, NextFunction, Request, Response } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import { db } from "./db";
import { applications, jobs, resumeProfile, users as legacyUsers } from "@shared/schema";
import { eq } from "drizzle-orm";
import { prisma } from "./prisma";
import { getJobtrackerDatabaseUrl } from "./prisma";
import { hashPassword, verifyPassword } from "./auth/password";
import { authLoginSchema, authRegisterSchema, authUserSchema, type AuthUser } from "@shared/models/auth";
import { buildCareerScoutDatabaseUrl } from "./db-url";

declare global {
  namespace Express {
    interface User extends AuthUser {}
  }
}

function stripSchemaParam(urlString: string) {
  try {
    const u = new URL(urlString);
    u.searchParams.delete("schema");
    return u.toString();
  } catch {
    return urlString;
  }
}

function isTruthy(v: string | undefined) {
  const raw = (v ?? "").toLowerCase().trim();
  return raw === "true" || raw === "1" || raw === "yes";
}

function isDevAuthBypassEnabled() {
  if (process.env.NODE_ENV === "production") return false;
  const raw = (process.env.CAREER_SCOUT_DEV_AUTH_BYPASS ?? "").toLowerCase().trim();
  // Default to enabled in non-production unless explicitly disabled.
  if (!raw) return true;
  return raw === "true" || raw === "1" || raw === "yes";
}

function isDemoLoginEnabled() {
  // In production, require explicit opt-in.
  if (process.env.NODE_ENV === "production") {
    return isTruthy(process.env.CAREER_SCOUT_ALLOW_DEMO_LOGIN) || isTruthy(process.env.JOBTRACKER_ALLOW_DEMO_LOGIN);
  }
  return !isTruthy(process.env.CAREER_SCOUT_ALLOW_DEMO_LOGIN)
    ? true
    : isTruthy(process.env.CAREER_SCOUT_ALLOW_DEMO_LOGIN);
}

function dbNotConfiguredError() {
  const err: any = new Error(
    "Database is not configured for auth. Attach Postgres and set DATABASE_URL (and optionally JOBTRACKER_DATABASE_URL).",
  );
  err.status = 503;
  return err;
}

let devSeedPromise: Promise<AuthUser> | null = null;
async function ensureDevSeedUser(): Promise<AuthUser> {
  if (devSeedPromise) return devSeedPromise;

  devSeedPromise = (async () => {
    const id = (process.env.CAREER_SCOUT_DEV_ADMIN_ID?.trim() || "dev_admin").slice(0, 128);
    const email = (process.env.CAREER_SCOUT_DEV_ADMIN_EMAIL?.trim() || "dev-admin@career-scout.local")
      .toLowerCase()
      .slice(0, 254);
    const name = (process.env.CAREER_SCOUT_DEV_ADMIN_NAME?.trim() || "Dev Admin").slice(0, 200);

    if (!getJobtrackerDatabaseUrl()) throw dbNotConfiguredError();

    // Seed Prisma user (JobTracker models).
    const userRow = await prisma.user.upsert({
      where: { id },
      update: { email, name },
      create: {
        id,
        email,
        name,
        rememberMe: true,
        profile: { create: {} },
      },
    });

    // Ensure legacy Drizzle user exists for Career Scout tables.
    const legacy = await db.select().from(legacyUsers).where(eq(legacyUsers.id, id)).limit(1);
    if (!legacy[0]) {
      await db.insert(legacyUsers).values({
        id,
        username: email,
        // Not used in dev bypass, but keeps schema constraints satisfied.
        password: hashPassword(`dev-${id}`),
      });
    }

    // Seed a minimal “welcome” job/application so the dashboard isn't empty.
    const existingJobs = await db.select().from(jobs).where(eq(jobs.userId, id)).limit(1);
    if (!existingJobs[0]) {
      const inserted = await db
        .insert(jobs)
        .values({
          userId: id,
          title: "Sample: Operations / Sales Leader",
          company: "Acme Corp",
          location: "Remote",
          salary: "$120k–$160k",
          description: "This is sample data seeded for local development.",
          matchScore: 78,
          priority: "high",
          source: "seed",
          isActive: true,
        })
        .returning({ id: jobs.id });

      const jobId = inserted[0]?.id;
      if (jobId) {
        await db.insert(applications).values({
          userId: id,
          jobId,
          status: "pending",
          notes: "Seeded application (local dev).",
        });
      }
    }

    // Seed a minimal resume profile row (some UI expects it).
    const existingProfile = await db.select().from(resumeProfile).where(eq(resumeProfile.userId, id)).limit(1);
    if (!existingProfile[0]) {
      await db.insert(resumeProfile).values({
        userId: id,
        name,
        email,
        location: "Local Dev",
        summary: "This profile was auto-created for local development (auth bypass).",
      });
    }

    return authUserSchema.parse({
      id: userRow.id,
      email: userRow.email,
      name: userRow.name ?? null,
    });
  })();

  return devSeedPromise;
}

export function setupAuth(app: Express) {
  const { Pool } = pg;
  const PgSession = connectPgSimple(session);

  // Prefer the existing Career Scout DATABASE_URL for sessions (public schema).
  const sessionDbUrl = stripSchemaParam(
    process.env.DATABASE_URL?.trim() || buildCareerScoutDatabaseUrl() || "",
  );

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "headhunter-secret",
    resave: false,
    saveUninitialized: false,
    store: sessionDbUrl
      ? new PgSession({
          pool: new Pool({ connectionString: sessionDbUrl }),
          // Keep sessions in public so they work even if the JobTracker schema isn't provisioned yet.
          schemaName: (process.env.SESSION_DB_SCHEMA || "public").trim() || "public",
          tableName: "career_scout_sessions",
          createTableIfMissing: true,
        })
      : undefined, // fallback to MemoryStore if DB isn't configured
    cookie: {
      secure: app.get("env") === "production",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Dev-only auth bypass: inject a stable admin user when no session exists.
  // Production behavior is unchanged.
  app.use(async (req, res, next) => {
    try {
      if (!isDevAuthBypassEnabled()) return next();
      if (!req.path.startsWith("/api")) return next();
      if (req.isAuthenticated?.() && req.user) return next();

      const safeUser = await ensureDevSeedUser();
      (req as any).user = safeUser;
      (req as any).isAuthenticated = () => true;
      return next();
    } catch (e: any) {
      // In dev, surface a clear error instead of silently 401'ing.
      const status = e?.status || 503;
      return res.status(status).json({
        message: "Dev auth bypass failed (database not ready/configured).",
        detail: e?.message ?? String(e),
      });
    }
  });

  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
      try {
        if (!getJobtrackerDatabaseUrl()) {
          return done(dbNotConfiguredError());
        }

        const normalizedEmail = String(email || "").trim().toLowerCase();
        if (!normalizedEmail || !password) {
          return done(null, false, { message: "Invalid email or password" });
        }

        // Primary: Prisma user (JobTracker schema)
        const prismaUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (prismaUser?.passwordHash) {
          const ok = verifyPassword(password, prismaUser.passwordHash);
          if (!ok) return done(null, false, { message: "Invalid email or password" });

          const safeUser = authUserSchema.parse({
            id: prismaUser.id,
            email: prismaUser.email,
            name: prismaUser.name ?? null,
          });

          // Ensure legacy Drizzle user exists for existing Career Scout tables during migration.
          const legacy = await db
            .select()
            .from(legacyUsers)
            .where(eq(legacyUsers.id, safeUser.id))
            .limit(1);
          if (!legacy[0]) {
            await db.insert(legacyUsers).values({
              id: safeUser.id,
              username: safeUser.email,
              password: prismaUser.passwordHash,
            });
          }

          return done(null, safeUser);
        }

        // Secondary (migration bridge): legacy user in Drizzle (public schema)
        const legacy = await db
          .select()
          .from(legacyUsers)
          .where(eq(legacyUsers.username, normalizedEmail))
          .limit(1);
        const legacyUser = legacy[0];
        if (!legacyUser) return done(null, false, { message: "Invalid email or password" });

        const legacyPassword = legacyUser.password || "";
        const legacyOk = legacyPassword.startsWith("$2")
          ? verifyPassword(password, legacyPassword)
          : legacyPassword === password;
        if (!legacyOk) return done(null, false, { message: "Invalid email or password" });

        // Create Prisma user with same id so existing foreign keys remain valid.
        const created = await prisma.user.create({
          data: {
            id: legacyUser.id,
            email: legacyUser.username,
            passwordHash: hashPassword(password),
            rememberMe: true,
          },
        });

        const safeUser = authUserSchema.parse({
          id: created.id,
          email: created.email,
          name: created.name ?? null,
        });

        // Upgrade legacy stored password to a hash (no longer plain-text).
        await db
          .update(legacyUsers)
          .set({ password: created.passwordHash ?? legacyUser.password })
          .where(eq(legacyUsers.id, legacyUser.id));

        return done(null, safeUser);
      } catch (err) {
        return done(err);
      }
      },
    ),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const prismaUser = await prisma.user.findUnique({ where: { id } });
      if (!prismaUser) return done(null, false);
      const safeUser = authUserSchema.parse({
        id: prismaUser.id,
        email: prismaUser.email,
        name: prismaUser.name ?? null,
      });
      done(null, safeUser);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      if (!getJobtrackerDatabaseUrl()) {
        return res.status(503).json({ message: "Database is not configured for registration." });
      }

      const input = authRegisterSchema.parse(req.body);
      const email = input.email.toLowerCase();

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return res.status(400).send("Email already exists");

      const created = await prisma.user.create({
        data: {
          email,
          name: input.name || null,
          passwordHash: hashPassword(input.password),
          rememberMe: true,
          profile: { create: {} },
        },
      });

      // Bridge user for legacy Drizzle-backed features during migration.
      await db.insert(legacyUsers).values({
        id: created.id,
        username: created.email,
        password: created.passwordHash ?? "",
      });

      const safeUser = authUserSchema.parse({
        id: created.id,
        email: created.email,
        name: created.name ?? null,
      });

      req.login(safeUser, (err) => {
        if (err) return next(err);
        res.status(201).json(safeUser);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    const parsed = authLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid login payload" });
    }

    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        if (err?.status === 503) return res.status(503).json({ message: err.message });
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid email or password" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        // Align with JobTracker behavior:
        // - rememberMe: 30 days
        // - otherwise: 12 hours
        if (req.session) {
          const rememberMe = Boolean((req.body as any)?.rememberMe);
          req.session.cookie.maxAge = rememberMe
            ? 30 * 24 * 60 * 60 * 1000
            : 12 * 60 * 60 * 1000;
        }
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/demo-login", async (req, res, next) => {
    try {
      if (!isDemoLoginEnabled()) return res.status(404).json({ message: "Demo mode is disabled." });
      if (!getJobtrackerDatabaseUrl()) return res.status(503).json({ message: "Database is not configured for demo login." });

      const email = "demo@career-scout.local";
      const existing = await prisma.user.findUnique({ where: { email } });
      const userRow =
        existing ??
        (await prisma.user.create({
          data: {
            email,
            name: "Demo User",
            passwordHash: hashPassword(`demo-${Date.now()}-${Math.random().toString(16).slice(2)}`),
            rememberMe: true,
            profile: { create: {} },
          },
        }));

      const safeUser = authUserSchema.parse({
        id: userRow.id,
        email: userRow.email,
        name: userRow.name ?? null,
      });

      // Bridge user for legacy Drizzle-backed features during migration.
      const legacy = await db
        .select()
        .from(legacyUsers)
        .where(eq(legacyUsers.id, safeUser.id))
        .limit(1);
      if (!legacy[0]) {
        await db.insert(legacyUsers).values({
          id: safeUser.id,
          username: safeUser.email,
          password: userRow.passwordHash ?? "",
        });
      }

      req.login(safeUser, (err) => {
        if (err) return next(err);
        res.status(200).json(safeUser);
      });
    } catch (e) {
      next(e);
    }
  });

  // Optional: bootstrap an admin account via env vars (idempotent).
  // Set CAREER_SCOUT_ADMIN_EMAIL + CAREER_SCOUT_ADMIN_PASSWORD on Railway.
  (async () => {
    try {
      const adminEmailRaw = process.env.CAREER_SCOUT_ADMIN_EMAIL?.trim();
      const adminPassword = process.env.CAREER_SCOUT_ADMIN_PASSWORD?.trim();
      if (!adminEmailRaw || !adminPassword) return;
      if (!getJobtrackerDatabaseUrl()) return;

      const adminEmail = adminEmailRaw.toLowerCase();
      const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
      const userRow =
        existing ??
        (await prisma.user.create({
          data: {
            email: adminEmail,
            name: process.env.CAREER_SCOUT_ADMIN_NAME?.trim() || "Admin",
            passwordHash: hashPassword(adminPassword),
            rememberMe: true,
            profile: { create: {} },
          },
        }));

      if (!userRow.passwordHash) {
        await prisma.user.update({
          where: { id: userRow.id },
          data: { passwordHash: hashPassword(adminPassword) },
        });
      }

      const legacy = await db
        .select()
        .from(legacyUsers)
        .where(eq(legacyUsers.id, userRow.id))
        .limit(1);
      if (!legacy[0]) {
        await db.insert(legacyUsers).values({
          id: userRow.id,
          username: userRow.email,
          password: userRow.passwordHash ?? "",
        });
      }
      console.log(`[auth] Bootstrapped admin user: ${adminEmail}`);
    } catch (e: any) {
      console.warn("[auth] Admin bootstrap failed (continuing):", e?.message ?? e);
    }
  })();

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
