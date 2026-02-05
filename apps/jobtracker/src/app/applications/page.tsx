import { Card } from "@/components/ui/Card";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import { ApplicationsBoard } from "./ApplicationsBoard";

function fmtDate(d?: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit" }).format(
    d
  );
}

function toDateInputValue(d?: Date | null) {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default async function ApplicationsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  async function updateFollowUp(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    const date = String(formData.get("nextFollowUpAt") ?? "").trim();
    if (!id) return;
    await prisma.application.update({
      where: { id },
      data: { nextFollowUpAt: date ? new Date(`${date}T09:00:00`) : null }
    });
  }

  const applications = await prisma.application.findMany({
    where: { userId },
    include: {
      job: { include: { company: true } },
      outreach: { orderBy: { sentAt: "desc" }, take: 1 },
      _count: { select: { outreach: true } }
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 200
  });

  const due = await prisma.application.findMany({
    where: {
      userId,
      nextFollowUpAt: { not: null, lte: new Date() },
      stage: { not: "CLOSED" }
    },
    include: { job: { include: { company: true } } },
    orderBy: { nextFollowUpAt: "asc" },
    take: 25
  });

  const boardInitial = applications.map((a) => ({
    id: a.id,
    stage: a.stage,
    nextFollowUpAt: a.nextFollowUpAt?.toISOString() ?? null,
    job: {
      title: a.job.title,
      companyName: a.job.company?.name ?? null
    },
    outreachCount: a._count.outreach,
    lastOutreachAt: a.outreach[0]?.sentAt?.toISOString() ?? null
  }));

  return (
    <div className="space-y-4">
      <Card
        title="Applications"
        description="Track pipeline stages, contacts, and follow-ups (with reminders)."
      >
        <div className="text-muted text-sm">
          Stages: Interested → Applied → Recruiter screen → Interview → Offer → Closed.
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Follow-up queue" description="What’s due now (based on next follow-up date).">
          {due.length === 0 ? (
            <div className="text-muted text-sm">Nothing due right now.</div>
          ) : (
            <div className="mt-2 space-y-2">
              {due.map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/10"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      className="text-sm font-medium underline decoration-white/10 underline-offset-4"
                      href={`/applications/${a.id}`}
                    >
                      {a.job.title}
                    </Link>
                    <div className="text-xs text-white/60">Due {fmtDate(a.nextFollowUpAt)}</div>
                  </div>
                  <div className="text-muted text-sm">
                    {a.job.company?.name ?? "Unknown company"}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <form action={updateFollowUp}>
                      <input type="hidden" name="id" value={a.id} />
                      <Input
                        className="w-44"
                        name="nextFollowUpAt"
                        type="date"
                        defaultValue={toDateInputValue(a.nextFollowUpAt)}
                      />
                    </form>
                    <Link
                      className="text-xs text-white/70 underline decoration-white/20 underline-offset-4"
                      href={`/outreach?applicationId=${a.id}`}
                    >
                      Write follow-up
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="How to use this" description="Agency-style flow that gets replies.">
          <div className="text-muted text-sm">
            - Track jobs you like from the Jobs page
            <br />
            - Move stages as you apply/interview
            <br />
            - Set a next follow-up date after every outreach
          </div>
        </Card>
      </div>

      <Card title="Pipeline" description="Drag-and-drop between stages.">
        <ApplicationsBoard initial={boardInitial} />
      </Card>
    </div>
  );
}

