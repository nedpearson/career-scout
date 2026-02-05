import "./server/load-env";
import { defineConfig } from "drizzle-kit";
import { buildCareerScoutDatabaseUrl } from "./server/db-url";

const url = process.env.DATABASE_URL?.trim() || buildCareerScoutDatabaseUrl();
if (!url) {
  throw new Error("DATABASE_URL is missing and no PG* vars found (ensure Postgres is provisioned)");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url,
  },
});
