import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getOpenAIClient } from "@/lib/ai/openai";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const schema = z.object({
  companyId: z.string().optional(),
  jobId: z.string().optional()
});

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = getOpenAIClient();
  if (!client) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not set (AI disabled)" },
      { status: 400 }
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { companyId, jobId } = parsed.data;
  if (!companyId && !jobId) {
    return NextResponse.json({ error: "Provide companyId or jobId" }, { status: 400 });
  }

  const job = jobId
    ? await prisma.job.findFirst({ where: { id: jobId, userId }, include: { company: true } })
    : null;

  const company =
    companyId
      ? await prisma.company.findFirst({ where: { id: companyId, userId } })
      : job?.company ?? null;

  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const profile = await prisma.profile.findUnique({ where: { userId } });
  const skills = await prisma.skill.findMany({ where: { userId }, orderBy: [{ isCore: "desc" }] });

  const prompt = [
    "You are an elite recruiting strategist helping a candidate understand a company and position themselves.",
    "",
    `Company: ${company.name}`,
    company.website ? `Website: ${company.website}` : "",
    job ? `Role: ${job.title}` : "",
    job?.description ? `Job description:\n${job.description.slice(0, 5000)}` : "",
    profile?.summary ? `Candidate summary:\n${profile.summary.slice(0, 1500)}` : "",
    skills.length ? `Candidate skills: ${skills.slice(0, 20).map((s) => s.name).join(", ")}` : "",
    "",
    "Return JSON with keys:",
    "- summary: 3-5 bullets describing what the company likely values and how it operates (do not invent facts; use 'likely' if unsure)",
    "- howToHelp: 3-5 bullets describing how the candidate could help (specific, measurable impact)",
    "- cultureSignals: 3 bullets of culture/working-style signals to probe in interviews",
    "- interviewAngles: 3 bullets with angles/stories the candidate should lead with",
    "",
    "Be concise. No fluff."
  ]
    .filter(Boolean)
    .join("\n");

  const completion = await client.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0.5,
    messages: [{ role: "user", content: prompt }]
  });

  const text = completion.choices[0]?.message?.content ?? "";
  const json = safeJson(text);
  if (!json?.summary || !json?.howToHelp) {
    return NextResponse.json({ error: "AI response format error" }, { status: 502 });
  }

  const saved = await prisma.company.update({
    where: { id: company.id },
    data: {
      aiSummary: JSON.stringify(json.summary),
      aiHowToHelp: JSON.stringify(json.howToHelp)
    }
  });

  return NextResponse.json({
    companyId: saved.id,
    summary: json.summary,
    howToHelp: json.howToHelp,
    cultureSignals: json.cultureSignals ?? [],
    interviewAngles: json.interviewAngles ?? []
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

