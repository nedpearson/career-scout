import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getOpenAIClient } from "@/lib/ai/openai";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const schema = z.object({
  jobId: z.string().optional(),
  companyName: z.string().optional(),
  roleTitle: z.string().optional(),
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
    return NextResponse.json(
      { error: "OPENAI_API_KEY not set (AI drafting disabled)" },
      { status: 400 }
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const input = parsed.data;

  const [profile, skills] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.skill.findMany({ where: { userId }, orderBy: [{ isCore: "desc" }, { level: "desc" }] })
  ]);

  const job =
    input.jobId
      ? await prisma.job.findFirst({
          where: { id: input.jobId, userId },
          include: { company: true }
        })
      : null;

  const companyName = input.companyName ?? job?.company?.name ?? "the company";
  const roleTitle = input.roleTitle ?? job?.title ?? "the role";

  const skillLine =
    skills.length === 0
      ? "Skills: (not provided)"
      : `Skills: ${skills.slice(0, 18).map((s) => s.name).join(", ")}`;

  const profileSummary = profile?.summary || profile?.headline || profile?.resumeText || "";

  const toneGuide =
    input.tone === "WARM"
      ? "Warm, friendly, upbeat. Confident but not salesy."
      : input.tone === "DIRECT"
        ? "Direct, concise, high-signal. No fluff."
        : "Neutral, professional, clear and human.";

  const humanGuide =
    input.humanLevel >= 80
      ? "Sound very human: varied sentence lengths, light natural phrasing, avoid corporate buzzwords."
      : input.humanLevel >= 50
        ? "Sound human but professional: minimal jargon, clear structure."
        : "Sound formal and structured: short sentences, very businesslike.";

  const jobContext = job?.description
    ? `Job description:\n${job.description.slice(0, 6000)}`
    : "";

  const prompt = [
    "You are an elite recruiting agency writing a first outreach email.",
    `Write an email that helps the candidate get a reply.`,
    "",
    `Target company: ${companyName}`,
    `Role: ${roleTitle}`,
    skillLine,
    profileSummary ? `Candidate summary:\n${profileSummary.slice(0, 2500)}` : "",
    jobContext,
    input.extraNotes ? `Extra notes:\n${input.extraNotes.slice(0, 1200)}` : "",
    "",
    "Constraints:",
    `- Tone: ${toneGuide}`,
    `- Human sounding: ${humanGuide}`,
    "- Keep it under 170 words.",
    "- Include 2 concrete value points tailored to the role/company.",
    "- End with a clear, low-friction call to action (15-min chat or quick question).",
    "- Do not mention being an AI.",
    "",
    "Return JSON with keys: subject, bodyText (plain text)."
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
  if (!json?.subject || !json?.bodyText) {
    return NextResponse.json(
      { error: "AI response format error. Try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    subject: String(json.subject),
    bodyText: String(json.bodyText)
  });
}

function safeJson(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    // try to extract the first {...} block
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

