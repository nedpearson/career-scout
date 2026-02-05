import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildJobtrackerDatabaseUrl } from "./jobtracker-db-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const JOBTRACKER_DB_NOT_CONFIGURED_MESSAGE =
  "JobTracker database is not configured. Set JOBTRACKER_DATABASE_URL (recommended) or attach a Postgres service (PGHOST/PGUSER/PGPASSWORD/PGDATABASE).";

export function getJobtrackerDatabaseUrl(): string | undefined {
  return process.env.JOBTRACKER_DATABASE_URL?.trim() || buildJobtrackerDatabaseUrl();
}

function makePrismaMissingProxy(): PrismaClient {
  const err = () => new Error(JOBTRACKER_DB_NOT_CONFIGURED_MESSAGE);
  const handler: ProxyHandler<object> = {
    get() {
      throw err();
    },
    apply() {
      throw err();
    },
  };
  return new Proxy(function () {}, handler) as unknown as PrismaClient;
}

function withPgSearchPath(urlString: string, schema: string): string {
  // Prisma's `?schema=` param is interpreted by Prisma's engine/CLI, but when
  // using driver adapters the underlying `pg` connection still defaults its
  // search_path to `public`. Force the desired schema at the Postgres level.
  //
  // Connection string parameter `options=-c search_path=<schema>` is supported
  // by Postgres/libpq and parsed by the `pg` driver.
  try {
    const u = new URL(urlString);
    const desired = `-c search_path=${schema}`;
    const existing = u.searchParams.get("options");
    if (!existing) u.searchParams.set("options", desired);
    else if (!existing.includes("search_path=")) u.searchParams.set("options", `${existing} ${desired}`.trim());
    return u.toString();
  } catch {
    return urlString;
  }
}

const prismaUrl = getJobtrackerDatabaseUrl();

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  (prismaUrl
    ? new PrismaClient({
        log: ["error", "warn"],
        adapter: new PrismaPg({
          connectionString: withPgSearchPath(
            prismaUrl,
            (process.env.JOBTRACKER_DB_SCHEMA || "jobtracker").trim() || "jobtracker",
          ),
        }),
      })
    : (console.warn(`[prisma] ${JOBTRACKER_DB_NOT_CONFIGURED_MESSAGE}`),
      makePrismaMissingProxy()));

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

