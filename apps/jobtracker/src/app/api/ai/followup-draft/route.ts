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
  humanLevel: z.number().min(0).max(100).default(70)
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
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const input = parsed.data;
  const app = await prisma.application.findFirst({
    where: { id: input.applicationId, userId },
    include: {
      job: { include: { company: true } },
      outreach: { orderBy: { sentAt: "desc" } }
    }
  });
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  const [profile, skills] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.skill.findMany({ where: { userId }, orderBy: [{ isCore: "desc" }, { level: "desc" }] })
  ]);

  const last = app.outreach.find((e) => Boolean(e.sentAt)) ?? app.outreach[0] ?? null;
  const lastBody = last?.bodyText ?? "";
  const lastSubject = last?.subject ?? "";

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

  const skillLine =
    skills.length === 0
      ? "Skills: (not provided)"
      : `Skills: ${skills.slice(0, 16).map((s) => s.name).join(", ")}`;

  const profileSummary = profile?.summary || profile?.headline || "";

  const prompt = [
    "You are an elite recruiting agency writing a follow-up email for a candidate.",
    "",
    `Company: ${app.job.company?.name ?? "the company"}`,
    `Role: ${app.job.title}`,
    `Candidate summary: ${profileSummary || "(not provided)"}`,
    skillLine,
    "",
    lastSubject ? `Previous subject: ${lastSubject}` : "",
    lastBody ? `Previous email body:\n${lastBody.slice(0, 2500)}` : "",
    "",
    "Goal:",
    "- Write a short follow-up that references the previous note naturally (without sounding pushy).",
    "- Add 1 fresh, specific value point (relevant to the role).",
    "- End with a low-friction CTA.",
    "",
    "Constraints:",
    `- Tone: ${toneGuide}`,
    `- Human sounding: ${humanGuide}`,
    "- 70–120 words.",
    "- Plain text.",
    "- Do not mention being an AI.",
    "",
    "Return JSON with keys: subject, bodyText."
  ]
    .filter(Boolean)
    .join("\n");

  const completion = await client.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0.55,
    messages: [{ role: "user", content: prompt }]
  });

  const text = completion.choices[0]?.message?.content ?? "";
  const json = safeJson(text);
  if (!json?.subject || !json?.bodyText) {
    return NextResponse.json({ error: "AI response format error" }, { status: 502 });
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

