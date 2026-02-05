import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { WorkMode } from "@prisma/client";

export default async function ProfilePage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  async function saveProfile(formData: FormData) {
    "use server";
    const headline = String(formData.get("headline") ?? "").trim() || null;
    const summary = String(formData.get("summary") ?? "").trim() || null;
    const location = String(formData.get("location") ?? "").trim() || null;
    const linkedinUrl = String(formData.get("linkedinUrl") ?? "").trim() || null;
    const desiredTitles = String(formData.get("desiredTitles") ?? "").trim() || null;
    const desiredWorkModes = String(formData.get("desiredWorkModes") ?? "").trim() || null;
    const resumeText = String(formData.get("resumeText") ?? "").trim() || null;

    await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        headline: headline ?? undefined,
        summary: summary ?? undefined,
        location: location ?? undefined,
        linkedinUrl: linkedinUrl ?? undefined,
        desiredTitles: desiredTitles ?? undefined,
        desiredWorkModes: desiredWorkModes ?? undefined,
        resumeText: resumeText ?? undefined
      },
      update: {
        headline: headline ?? undefined,
        summary: summary ?? undefined,
        location: location ?? undefined,
        linkedinUrl: linkedinUrl ?? undefined,
        desiredTitles: desiredTitles ?? undefined,
        desiredWorkModes: desiredWorkModes ?? undefined,
        resumeText: resumeText ?? undefined
      }
    });
  }

  async function addSkill(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const level = Number(formData.get("level") ?? 3);
    const isCore = String(formData.get("isCore") ?? "") === "on";
    if (!name) return;
    await prisma.skill.upsert({
      where: { userId_name: { userId, name } },
      create: { userId, name, level: Number.isFinite(level) ? level : 3, isCore },
      update: { level: Number.isFinite(level) ? level : 3, isCore }
    });
  }

  async function deleteSkill(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    await prisma.skill.delete({ where: { id } });
  }

  const [profile, skills] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.skill.findMany({ where: { userId }, orderBy: [{ isCore: "desc" }, { name: "asc" }] })
  ]);

  return (
    <div className="space-y-4">
      <Card title="Profile" description="Used to score fit and draft outreach.">
        <form action={saveProfile} className="mt-3 grid gap-3">
          <div className="grid gap-2 md:grid-cols-2">
            <Input name="headline" defaultValue={profile?.headline ?? ""} placeholder="Headline" />
            <Input name="location" defaultValue={profile?.location ?? ""} placeholder="Location" />
          </div>
          <div className="grid gap-2 md:grid-cols-2 md:items-center">
            <Input
              name="linkedinUrl"
              defaultValue={profile?.linkedinUrl ?? ""}
              placeholder="LinkedIn profile URL (optional)"
            />
            <div className="text-muted text-sm">
              {profile?.linkedinUrl ? (
                <a
                  className="underline decoration-white/20 underline-offset-4"
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open LinkedIn profile
                </a>
              ) : (
                "Add your LinkedIn so we can open it quickly while applying."
              )}
            </div>
          </div>
          <Textarea
            name="summary"
            defaultValue={profile?.summary ?? ""}
            placeholder="Short summary: what you do, what you’re great at, what roles you’re targeting."
          />
          <div className="grid gap-2 md:grid-cols-2">
            <Input
              name="desiredTitles"
              defaultValue={profile?.desiredTitles ?? ""}
              placeholder="Target titles (comma-separated)"
            />
            <Select name="desiredWorkModes" defaultValue={profile?.desiredWorkModes ?? ""}>
              <option value="">Any work mode</option>
              <option value={WorkMode.REMOTE}>Remote</option>
              <option value={WorkMode.HYBRID}>Hybrid</option>
              <option value={WorkMode.ONSITE}>Onsite / Local</option>
              <option value={`${WorkMode.REMOTE},${WorkMode.HYBRID}`}>Remote or Hybrid</option>
            </Select>
          </div>
          <Textarea
            name="resumeText"
            defaultValue={profile?.resumeText ?? ""}
            placeholder="Optional: paste resume text (used for richer AI scoring later)."
          />
          <div className="flex justify-end">
            <Button type="submit">Save profile</Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Skills" description="Add skills; scoring searches for these in job postings.">
          <form action={addSkill} className="mt-2 grid gap-2 md:grid-cols-4">
            <div className="md:col-span-2">
              <Input name="name" placeholder="Skill (e.g. React, Python, Salesforce)" required />
            </div>
            <Select name="level" defaultValue="3">
              <option value="1">Level 1</option>
              <option value="2">Level 2</option>
              <option value="3">Level 3</option>
              <option value="4">Level 4</option>
              <option value="5">Level 5</option>
            </Select>
            <Button type="submit" variant="secondary">
              Add / update
            </Button>
            <label className="text-muted flex items-center gap-2 text-xs md:col-span-4">
              <input className="accent-white" name="isCore" type="checkbox" /> Mark as core skill
            </label>
          </form>

          <div className="mt-3 space-y-2">
            {skills.length === 0 ? (
              <div className="text-muted text-sm">No skills yet.</div>
            ) : (
              skills.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.03] p-2 ring-1 ring-white/10"
                >
                  <div className="text-sm">
                    <span className="font-medium">{s.name}</span>{" "}
                    <span className="text-muted">• L{s.level}</span>
                    {s.isCore ? <span className="text-muted"> • core</span> : null}
                  </div>
                  <form action={deleteSkill}>
                    <input type="hidden" name="id" value={s.id} />
                    <button className="text-xs text-white/60 hover:text-white">Remove</button>
                  </form>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title="How scoring works (v0)" description="Fast + explainable; AI deep dive later.">
          <div className="text-muted text-sm">
            Current score weights:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Skills mentioned in the job description</li>
              <li>Title aligns with your target titles</li>
              <li>Work mode matches your preference</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}

