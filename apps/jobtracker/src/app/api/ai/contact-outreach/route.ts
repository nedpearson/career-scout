import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getOpenAIClient } from "@/lib/ai/openai";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const schema = z.object({
  applicationId: z.string().min(1),
  contactId: z.string().min(1),
  channel: z.enum(["EMAIL", "LINKEDIN", "FACEBOOK", "INSTAGRAM"]).default("LINKEDIN"),
  tone: z.enum(["WARM", "NEUTRAL", "DIRECT"]).default("NEUTRAL"),
  humanLevel: z.number().min(0).max(100).default(70),
  extraNotes: z.string().optional().default("")
});

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = getOpenAIClient();
  if (!client) return NextResponse.json({ error: "OPENAI_API_KEY not set (AI disabled)" }, { status: 400 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const input = parsed.data;

  const [app, contact, link, profile, skills] = await Promise.all([
    prisma.application.findFirst({
      where: { id: input.applicationId, userId },
      include: { job: { include: { company: true } } }
    }),
    prisma.contact.findFirst({ where: { id: input.contactId, userId } }),
    prisma.applicationContact.findFirst({
      where: { applicationId: input.applicationId, contactId: input.contactId }
    }),
    prisma.profile.findUnique({ where: { userId } }),
    prisma.skill.findMany({ where: { userId }, orderBy: [{ isCore: "desc" }, { level: "desc" }] })
  ]);

  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const toneGuide =
    input.tone === "WARM"
      ? "Warm, friendly, upbeat. Confident but not salesy."
      : input.tone === "DIRECT"
        ? "Direct, concise, high-signal. No fluff."
        : "Neutral, professional, clear and human.";

  const humanGuide =
    input.humanLevel >= 80
      ? "Sound very human: varied sentence lengths, light natural phrasing, avoid buzzwords."
      : input.humanLevel >= 50
        ? "Sound human but professional: minimal jargon, clear structure."
        : "Sound formal and structured: short sentences, very businesslike.";

  const channelRules =
    input.channel === "EMAIL"
      ? "Write an email. Include a subject. 90–160 words."
      : "Write a short DM. 250–450 characters. Plain text.";

  const relationship = link?.relationship || "";
  const strength = contact.strength ?? 3;

  const skillLine =
    skills.length === 0 ? "" : `Candidate skills: ${skills.slice(0, 12).map((s) => s.name).join(", ")}`;

  const prompt = [
    "You are an elite headhunter helping a candidate get a referral/introduction.",
    "",
    `Channel: ${input.channel}`,
    `Rules: ${channelRules}`,
    `Tone: ${toneGuide}`,
    `Human sounding: ${humanGuide}`,
    "",
    `Contact: ${contact.name}${contact.title ? `, ${contact.title}` : ""}${contact.company ? ` at ${contact.company}` : ""}`,
    relationship ? `Relationship label: ${relationship}` : "",
    `Relationship strength (1-5): ${strength}`,
    "",
    `Target role: ${app.job.title}`,
    `Target company: ${app.job.company?.name ?? "Unknown company"}`,
    app.job.location ? `Location: ${app.job.location}` : "",
    "",
    profile?.summary ? `Candidate summary:\n${profile.summary.slice(0, 900)}` : "",
    profile?.headline ? `Candidate headline: ${profile.headline}` : "",
    skillLine,
    input.extraNotes ? `Extra notes:\n${input.extraNotes.slice(0, 600)}` : "",
    "",
    "Constraints:",
    "- Ask for a specific action: intro to recruiter/HM, forward resume, or advice on best contact.",
    "- Include 1 concrete value point relevant to the role.",
    "- Make it easy to reply yes/no.",
    "- Do not mention being an AI.",
    "",
    input.channel === "EMAIL"
      ? "Return JSON with keys: subject, bodyText."
      : "Return JSON with key: messageText."
  ].join("\n");

  const completion = await client.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0.6,
    messages: [{ role: "user", content: prompt }]
  });

  const text = completion.choices[0]?.message?.content ?? "";
  const json = safeJson(text);
  if (!json) return NextResponse.json({ error: "AI response format error" }, { status: 502 });

  if (input.channel === "EMAIL") {
    if (!json.subject || !json.bodyText) return NextResponse.json({ error: "AI response missing subject/bodyText" }, { status: 502 });
    return NextResponse.json({ subject: String(json.subject), bodyText: String(json.bodyText) });
  }

  if (!json.messageText) return NextResponse.json({ error: "AI response missing messageText" }, { status: 502 });
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

