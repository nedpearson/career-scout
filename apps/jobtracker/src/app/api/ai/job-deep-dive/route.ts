import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getOpenAIClient } from "@/lib/ai/openai";
import { env } from "@/lib/env";
import { computeMatchScore } from "@/lib/matchScore";

export const runtime = "nodejs";

const schema = z.object({
  jobId: z.string().min(1)
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

  const job = await prisma.job.findFirst({
    where: { id: parsed.data.jobId, userId },
    include: { company: true }
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const [profile, skills] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.skill.findMany({ where: { userId }, orderBy: [{ isCore: "desc" }, { level: "desc" }] })
  ]);

  const baseline = computeMatchScore({
    profile,
    skills,
    job: {
      title: job.title,
      description: job.description,
      requirements: job.requirements,
      workMode: job.workMode
    }
  });

  const prompt = [
    "You are an elite headhunter and interview coach.",
    "Analyze the job and the candidate and produce a deep-dive fit report that helps the candidate win.",
    "",
    `Company: ${job.company?.name ?? "Unknown company"}`,
    `Role: ${job.title}`,
    job.location ? `Location: ${job.location}` : "",
    job.workMode ? `Work mode: ${job.workMode}` : "",
    "",
    job.description ? `Job description:\n${job.description.slice(0, 6500)}` : "",
    job.requirements ? `Requirements:\n${job.requirements.slice(0, 2500)}` : "",
    "",
    profile?.summary ? `Candidate summary:\n${profile.summary.slice(0, 1800)}` : "",
    profile?.resumeText ? `Candidate resume text:\n${profile.resumeText.slice(0, 4000)}` : "",
    skills.length ? `Candidate skills: ${skills.slice(0, 25).map((s) => s.name).join(", ")}` : "",
    "",
    "Return JSON with keys:",
    "- fitScore: number 0..100 (your best estimate, can differ from baseline)",
    "- strengths: 4-6 bullets showing why they fit (grounded in the provided candidate info)",
    "- gaps: 3-5 bullets on gaps/risks and how to address them",
    "- missingSkills: 5-10 keywords that appear important but not clearly present in candidate info",
    "- resumeTweaks: 3-5 bullet rewrites that would improve alignment",
    "- interviewAngles: 4-6 bullets (stories/angles + suggested metrics)",
    "- outreachHooks: 3 short hooks to use in outreach (1 sentence each)",
    "- questionsToAsk: 5 strong questions to ask the hiring manager",
    "",
    "Constraints:",
    "- Do not invent facts about the candidate or company; use conditional language if unsure.",
    "- Keep it concise but high-signal."
  ]
    .filter(Boolean)
    .join("\n");

  const completion = await client.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0.45,
    messages: [{ role: "user", content: prompt }]
  });

  const text = completion.choices[0]?.message?.content ?? "";
  const json = safeJson(text);
  if (!json) return NextResponse.json({ error: "AI response format error" }, { status: 502 });

  const fitScore =
    typeof json.fitScore === "number" ? Math.max(0, Math.min(100, json.fitScore)) : baseline.score;

  await prisma.job.update({
    where: { id: job.id },
    data: {
      matchScore: fitScore,
      matchNotes: baseline.notes || job.matchNotes,
      aiDeepDive: JSON.stringify({ baseline, report: json })
    }
  });

  return NextResponse.json({
    ok: true,
    baseline,
    report: json
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

