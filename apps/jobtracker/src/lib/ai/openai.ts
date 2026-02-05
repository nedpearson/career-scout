import OpenAI from "openai";
import { env } from "@/lib/env";

export function getOpenAIClient() {
  if (!env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}

