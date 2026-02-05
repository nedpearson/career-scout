import type { Job, Profile, Skill, WorkMode } from "@prisma/client";
import { includesPhrase } from "@/lib/text/keywords";

export type MatchResult = {
  score: number; // 0..100
  matchedSkills: string[];
  notes: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function parseCsv(s?: string | null): string[] {
  if (!s) return [];
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function workModeBonus(profile: Profile | null, jobMode: WorkMode | null): number {
  if (!profile || !jobMode) return 0;
  const desired = new Set(parseCsv(profile.desiredWorkModes).map((x) => x.toUpperCase()));
  if (desired.size === 0) return 0;
  return desired.has(jobMode) ? 1 : 0;
}

function titleBonus(profile: Profile | null, jobTitle: string): number {
  if (!profile?.desiredTitles) return 0;
  const desiredTitles = parseCsv(profile.desiredTitles);
  if (desiredTitles.length === 0) return 0;

  const jt = jobTitle.toLowerCase();
  const hit = desiredTitles.some((t) => jt.includes(t.toLowerCase()));
  return hit ? 1 : 0;
}

export function computeMatchScore({
  profile,
  skills,
  job
}: {
  profile: Profile | null;
  skills: Skill[];
  job: Pick<Job, "title" | "description" | "requirements" | "workMode">;
}): MatchResult {
  const jobText = `${job.title}\n${job.requirements ?? ""}\n${job.description ?? ""}`.trim();

  const skillNames = skills
    .map((s) => s.name.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  const matched: string[] = [];
  for (const name of skillNames) {
    if (includesPhrase(jobText, name)) matched.push(name);
  }

  const skillCoverage = skillNames.length === 0 ? 0 : matched.length / skillNames.length;
  const prefWorkMode = workModeBonus(profile, job.workMode);
  const prefTitle = titleBonus(profile, job.title);

  // Weights:
  // - Skills coverage: 65%
  // - Title preference: 20%
  // - Work mode preference: 15%
  const score =
    65 * clamp(skillCoverage, 0, 1) + 20 * prefTitle + 15 * prefWorkMode;

  const notesParts: string[] = [];
  if (matched.length > 0) notesParts.push(`Matched skills: ${matched.slice(0, 12).join(", ")}.`);
  if (skillNames.length === 0) notesParts.push("Add skills in Profile to improve scoring.");
  if (prefTitle) notesParts.push("Title aligns with your target titles.");
  if (prefWorkMode) notesParts.push("Work mode matches your preference.");

  return {
    score: Math.round(clamp(score, 0, 100)),
    matchedSkills: matched,
    notes: notesParts.join(" ")
  };
}

