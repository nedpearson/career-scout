import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().optional(),
  SESSION_SECRET: z.string().default("career-scout-ai-secret-default"),
  // OpenAI key handled by Replit AI Integration usually, but can be provided
  OPENAI_API_KEY: z.string().optional(),
});

export function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }

  return parsed.data;
}

export const config = validateEnv();
