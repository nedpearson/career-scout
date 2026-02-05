import { PrismaClient } from "@prisma/client";
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
        // IMPORTANT:
        // - We override the datasource URL at runtime because Prisma 7 config is
        //   provided via `prisma.config.ts` (CLI), not in `schema.prisma`.
        // - We intentionally do NOT use a driver adapter here. In practice we
        //   have observed the adapter path ignore the `?schema=` query param and
        //   query `public.*` tables even when migrations/db push target a
        //   different schema. Using the standard engine + datasource override
        //   ensures `?schema=jobtracker` is honored.
        datasources: { db: { url: prismaUrl } },
      })
    : (console.warn(`[prisma] ${JOBTRACKER_DB_NOT_CONFIGURED_MESSAGE}`),
      makePrismaMissingProxy()));

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

