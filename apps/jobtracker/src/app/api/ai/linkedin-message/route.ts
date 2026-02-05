import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getOpenAIClient } from "@/lib/ai/openai";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const schema = z.object({
  applicationId: z.string().min(1),
  tone: z.enum(["WARM", "NEUTRAL", "DIRECT"]).default("NEUTRAL"),
  humanLevel: z.number().min(0).max(100).default(70),
  extraNotes: z.string().optional().default("")
});

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = getOpenAIClient();
  if (!client) {
    return NextResponse.json({ error: "OPENAI_API_KEY not set (AI disabled)" }, { status: 400 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const input = parsed.data;

  const app = await prisma.application.findFirst({
    where: { id: input.applicationId, userId },
    include: { job: { include: { company: true } } }
  });
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  const [profile, skills] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.skill.findMany({ where: { userId }, orderBy: [{ isCore: "desc" }, { level: "desc" }] })
  ]);

  const toneGuide =
    input.tone === "WARM"
      ? "Warm, friendly, upbeat. Confident but not salesy."
      : input.tone === "DIRECT"
        ? "Direct, concise, high-signal. No fluff."
        : "Neutral, professional, clear and human.";

  const humanGuide =
    input.humanLevel >= 80
      ? "Sound very human and natural. Avoid buzzwords."
      : input.humanLevel >= 50
        ? "Sound human but professional. Clear structure."
        : "Sound formal and structured.";

  const skillLine =
    skills.length === 0
      ? "Skills: (not provided)"
      : `Skills: ${skills.slice(0, 12).map((s) => s.name).join(", ")}`;

  const prompt = [
    "You are an elite headhunter writing a LinkedIn message (DM or connection note).",
    "Write something that gets a reply.",
    "",
    `Company: ${app.job.company?.name ?? "the company"}`,
    `Role: ${app.job.title}`,
    app.job.location ? `Location: ${app.job.location}` : "",
    profile?.headline ? `Candidate headline: ${profile.headline}` : "",
    profile?.summary ? `Candidate summary: ${profile.summary.slice(0, 900)}` : "",
    skillLine,
    input.extraNotes ? `Extra notes: ${input.extraNotes.slice(0, 500)}` : "",
    "",
    "Constraints:",
    `- Tone: ${toneGuide}`,
    `- Human sounding: ${humanGuide}`,
    "- 350 characters max (LinkedIn-friendly).",
    "- 1 specific value point + 1 clear ask.",
    "- No emojis unless requested (don’t use emojis).",
    "",
    "Return JSON with key: messageText."
  ]
    .filter(Boolean)
    .join("\n");

  const completion = await client.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0.6,
    messages: [{ role: "user", content: prompt }]
  });

  const text = completion.choices[0]?.message?.content ?? "";
  const json = safeJson(text);
  if (!json?.messageText) return NextResponse.json({ error: "AI response format error" }, { status: 502 });

  return NextResponse.json({ messageText: String(json.messageText) });
}

function safeJson(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

