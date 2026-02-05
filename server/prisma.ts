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

const prismaUrl = getJobtrackerDatabaseUrl();

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  (prismaUrl
    ? new PrismaClient({
        log: ["error", "warn"],
        adapter: new PrismaPg({ connectionString: prismaUrl }),
      })
    : (console.warn(`[prisma] ${JOBTRACKER_DB_NOT_CONFIGURED_MESSAGE}`),
      makePrismaMissingProxy()));

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

