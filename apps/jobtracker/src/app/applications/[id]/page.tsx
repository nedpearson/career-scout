import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { ApplicationStage, EmailTone } from "@prisma/client";
import { FollowUpGenerator } from "./followup/FollowUpGenerator";
import { JobDeepDivePanel } from "./job/JobDeepDivePanel";
import { LinkedInPanel } from "./linkedin/LinkedInPanel";
import { MarkAppliedButton } from "./MarkAppliedButton";
import { scoreContactForOpportunity } from "@/lib/network/match";
import { ContactOutreachWidget } from "./mutuals/ContactOutreachWidget";

const STAGES: { key: ApplicationStage; label: string }[] = [
  { key: "INTERESTED", label: "Interested" },
  { key: "APPLIED", label: "Applied" },
  { key: "RECRUITER_SCREEN", label: "Recruiter screen" },
  { key: "INTERVIEW", label: "Interview" },
  { key: "OFFER", label: "Offer" },
  { key: "CLOSED", label: "Closed" }
];

function fmtDateTime(d?: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit"
  }).format(d);
}

function toDateInputValue(d?: Date | null) {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default async function ApplicationDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const { id } = await params;
  const [app, profile] = await Promise.all([
    prisma.application.findFirst({
      where: { id, userId },
      include: {
        job: { include: { company: true } },
        outreach: { orderBy: { createdAt: "desc" } }
      }
    }),
    prisma.profile.findUnique({ where: { userId } })
  ]);
  if (!app) return notFound();

  const contacts = await prisma.contact.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 300
  });

  const targetCompany = app.job.company?.name ?? null;
  const suggested = contacts
    .map((c) => ({ c, score: scoreContactForOpportunity({ contact: c, targetCompany }) }))
    .filter((x) => x.score >= 60)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  async function linkContact(formData: FormData) {
    "use server";
    const contactId = String(formData.get("contactId") ?? "");
    const relationship = String(formData.get("relationship") ?? "").trim() || null;
    if (!contactId) return;
    await prisma.applicationContact.upsert({
      where: { applicationId_contactId: { applicationId: id, contactId } },
      create: { userId, applicationId: id, contactId, relationship: relationship ?? undefined },
      update: { relationship: relationship ?? undefined }
    });
  }

  async function updateStage(formData: FormData) {
    "use server";
    const stage = String(formData.get("stage") ?? "") as ApplicationStage;
    await prisma.application.update({ where: { id }, data: { stage } });
  }

  async function updateFollowUp(formData: FormData) {
    "use server";
    const date = String(formData.get("nextFollowUpAt") ?? "").trim();
    await prisma.application.update({
      where: { id },
      data: { nextFollowUpAt: date ? new Date(`${date}T09:00:00`) : null }
    });
  }

  async function updateContact(formData: FormData) {
    "use server";
    const contactName = String(formData.get("contactName") ?? "").trim() || null;
    const contactEmail = String(formData.get("contactEmail") ?? "").trim() || null;
    const notes = String(formData.get("notes") ?? "").trim() || null;
    await prisma.application.update({
      where: { id },
      data: { contactName, contactEmail, notes }
    });
  }

  const lastOutreach = app.outreach.find((e) => Boolean(e.sentAt)) ?? app.outreach[0] ?? null;

  return (
    <div className="space-y-4">
      <Card title="Application details" description="Everything about this opportunity in one place.">
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-lg font-semibold">{app.job.title}</div>
            <div className="text-muted text-sm">
              {app.job.company?.name ?? "Unknown company"}
              {app.job.location ? ` • ${app.job.location}` : ""}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{app.stage}</Badge>
            <Badge>Match {typeof app.job.matchScore === "number" ? `${app.job.matchScore}/100` : "—"}</Badge>
            <Link
              className="text-xs text-white/70 underline decoration-white/20 underline-offset-4"
              href="/applications"
            >
              Back to pipeline
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Status" description="Stage + next follow-up.">
          <div className="grid gap-3 md:grid-cols-2">
            <form action={updateStage} className="grid gap-1">
              <div className="text-muted text-xs">Stage</div>
              <Select name="stage" defaultValue={app.stage}>
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </Select>
              <button className="glass rounded-xl px-3 py-2 text-sm ring-1 ring-white/10 hover:bg-white/10">
                Save stage
              </button>
            </form>

            <form action={updateFollowUp} className="grid gap-1">
              <div className="text-muted text-xs">Next follow-up</div>
              <Input
                name="nextFollowUpAt"
                type="date"
                defaultValue={toDateInputValue(app.nextFollowUpAt)}
              />
              <button className="glass rounded-xl px-3 py-2 text-sm ring-1 ring-white/10 hover:bg-white/10">
                Save follow-up
              </button>
            </form>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-muted text-sm">
              Applied: <span className="text-white/70">{fmtDateTime(app.appliedAt ?? null)}</span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-muted text-sm">
              Last outreach: <span className="text-white/70">{fmtDateTime(lastOutreach?.sentAt ?? null)}</span>
            </div>
            <Link
              className="text-xs text-white/70 underline decoration-white/20 underline-offset-4"
              href={`/outreach?applicationId=${app.id}&to=${encodeURIComponent(
                app.contactEmail ?? ""
              )}&subject=${encodeURIComponent(
                `Quick follow-up — ${app.job.title}`
              )}`}
            >
              Open outreach
            </Link>
          </div>

          <div className="mt-3">
            <FollowUpGenerator
              applicationId={app.id}
              toEmail={app.contactEmail ?? undefined}
              defaultTone={"NEUTRAL" satisfies EmailTone}
            />
          </div>

          <div className="mt-3">
            <MarkAppliedButton applicationId={app.id} />
          </div>
        </Card>

        <Card title="Contact + notes" description="Recruiter/hiring manager details + your internal notes.">
          <form action={updateContact} className="grid gap-2">
            <div className="grid gap-2 md:grid-cols-2">
              <Input
                name="contactName"
                defaultValue={app.contactName ?? ""}
                placeholder="Contact name"
              />
              <Input
                name="contactEmail"
                type="email"
                defaultValue={app.contactEmail ?? ""}
                placeholder="Contact email"
              />
            </div>
            <Textarea
              name="notes"
              defaultValue={app.notes ?? ""}
              placeholder="Notes: what you learned, interview prep, follow-up plan…"
            />
            <div className="flex justify-end">
              <button className="glass rounded-xl px-3 py-2 text-sm ring-1 ring-white/10 hover:bg-white/10">
                Save contact/notes
              </button>
            </div>
          </form>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Posting" description="Original job description / link.">
          {app.job.sourceUrl ? (
            <a
              className="text-sm text-white/80 underline decoration-white/20 underline-offset-4"
              href={app.job.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open posting
            </a>
          ) : (
            <div className="text-muted text-sm">No posting link saved.</div>
          )}
          {app.job.description ? (
            <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-black/20 p-3 text-xs text-white/75 ring-1 ring-white/10">
              {app.job.description.slice(0, 6000)}
            </pre>
          ) : (
            <div className="text-muted mt-3 text-sm">No description saved yet.</div>
          )}
        </Card>

        <Card title="Deep dive" description="AI fit report + interview angles (saved to this job).">
          <JobDeepDivePanel jobId={app.job.id} initialAiDeepDive={app.job.aiDeepDive ?? null} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="LinkedIn" description="Open LinkedIn to apply/contact; generate message copy.">
          <LinkedInPanel
            applicationId={app.id}
            jobTitle={app.job.title}
            companyName={app.job.company?.name ?? "Unknown company"}
            location={app.job.location}
            myLinkedInUrl={profile?.linkedinUrl ?? null}
            initialCompanyLinkedInUrl={app.job.company?.linkedinUrl ?? null}
            initialJobLinkedInUrl={app.job.linkedinJobUrl ?? null}
            initialContactLinkedInUrl={app.linkedinContactUrl ?? null}
            initialThreadLinkedInUrl={app.linkedinThreadUrl ?? null}
          />
        </Card>

        <Card title="Mutuals (your Network)" description="Suggested people to reach out to for this company.">
          {suggested.length === 0 ? (
            <div className="text-muted text-sm">
              No likely mutuals found yet. Add/import contacts in <Link href="/network" className="underline decoration-white/20 underline-offset-4">Network</Link> and include their company.
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              {suggested.map(({ c, score }) => (
                <div key={c.id} className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-white/60">
                      Match {score}/100 {c.company ? `• ${c.company}` : ""}
                    </div>
                  </div>
                  <div className="text-muted text-sm">
                    {(c.title ?? "").trim()}
                    {c.email ? ` • ${c.email}` : ""}
                  </div>
                  <div className="text-muted mt-1 text-xs">
                    Strength: {c.strength}/5 {c.hiringSignal ? "• Hiring signal" : ""}{" "}
                    {c.tags ? `• Tags: ${c.tags}` : ""}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2 text-xs">
                      {c.linkedinUrl ? (
                        <a className="underline decoration-white/20 underline-offset-4" href={c.linkedinUrl} target="_blank" rel="noreferrer">
                          LinkedIn
                        </a>
                      ) : null}
                      {c.facebookUrl ? (
                        <a className="underline decoration-white/20 underline-offset-4" href={c.facebookUrl} target="_blank" rel="noreferrer">
                          Facebook
                        </a>
                      ) : null}
                      {c.instagramUrl ? (
                        <a className="underline decoration-white/20 underline-offset-4" href={c.instagramUrl} target="_blank" rel="noreferrer">
                          Instagram
                        </a>
                      ) : null}
                      {c.email ? (
                        <Link
                          className="underline decoration-white/20 underline-offset-4"
                          href={`/outreach?applicationId=${app.id}&to=${encodeURIComponent(
                            c.email
                          )}&subject=${encodeURIComponent(
                            `Quick question — ${app.job.title} at ${app.job.company?.name ?? ""}`
                          )}`}
                        >
                          Email
                        </Link>
                      ) : null}
                    </div>
                    <form action={linkContact} className="flex items-center gap-2">
                      <input type="hidden" name="contactId" value={c.id} />
                      <input
                        name="relationship"
                        className="glass w-40 rounded-xl px-3 py-2 text-xs ring-1 ring-white/10"
                        placeholder="relationship (e.g. referral)"
                      />
                      <button className="glass rounded-xl px-3 py-2 text-xs ring-1 ring-white/10 hover:bg-white/10">
                        Link
                      </button>
                    </form>
                  </div>

                  <ContactOutreachWidget
                    applicationId={app.id}
                    contactId={c.id}
                    defaultEmail={c.email ?? null}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Outreach history" description="Everything you drafted/sent for this application.">
          {app.outreach.length === 0 ? (
            <div className="text-muted text-sm">No outreach yet.</div>
          ) : (
            <div className="mt-2 space-y-2">
              {app.outreach.map((e) => (
                <div key={e.id} className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/10">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">{e.subject}</div>
                    <div className="text-xs text-white/60">{fmtDateTime(e.sentAt ?? e.createdAt)}</div>
                  </div>
                  <div className="text-muted text-xs">
                    To: {e.toEmail ?? "—"} {e.ccEmail ? `• Cc: ${e.ccEmail}` : ""} • Tone: {e.tone} • Human:{" "}
                    {e.humanLevel}/100
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap text-xs text-white/75">
                    {e.bodyText.slice(0, 1600)}
                  </pre>
                  <div className="mt-2">
                    <Link
                      className="text-xs text-white/70 underline decoration-white/20 underline-offset-4"
                      href={`/outreach?applicationId=${app.id}&to=${encodeURIComponent(
                        e.toEmail ?? ""
                      )}&cc=${encodeURIComponent(e.ccEmail ?? "")}&subject=${encodeURIComponent(
                        e.subject
                      )}&bodyText=${encodeURIComponent(e.bodyText)}`}
                    >
                      Open draft in composer
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

