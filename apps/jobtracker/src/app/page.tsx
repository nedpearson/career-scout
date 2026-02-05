import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

function fmtShort(d: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(d);
}

function pct(n: number) {
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

export default async function HomePage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [byStage, followUpDueCount, followUpWeek, recentApps, recentOutreach, outreachWeekCount] =
    await prisma.$transaction([
      prisma.application.groupBy({
        by: ["stage"],
        where: { userId },
        _count: { _all: true }
      }),
      prisma.application.count({
        where: {
          userId,
          nextFollowUpAt: { not: null, lte: now },
          stage: { not: "CLOSED" }
        }
      }),
      prisma.application.findMany({
        where: {
          userId,
          nextFollowUpAt: { not: null, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
          stage: { not: "CLOSED" }
        },
        include: { job: { include: { company: true } } },
        orderBy: { nextFollowUpAt: "asc" },
        take: 6
      }),
      prisma.application.findMany({
        where: { userId },
        include: { job: { include: { company: true } } },
        orderBy: { updatedAt: "desc" },
        take: 6
      }),
      prisma.outreachEmail.findMany({
        where: { userId },
        include: { application: { include: { job: { include: { company: true } } } } },
        orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
        take: 6
      }),
      prisma.outreachEmail.count({
        where: { userId, createdAt: { gte: weekAgo } }
      })
    ]);

  const stageCount = new Map<string, number>();
  for (const row of byStage) stageCount.set(row.stage, row._count._all);

  const interested = stageCount.get("INTERESTED") ?? 0;
  const applied = stageCount.get("APPLIED") ?? 0;
  const recruiter = stageCount.get("RECRUITER_SCREEN") ?? 0;
  const interview = stageCount.get("INTERVIEW") ?? 0;
  const offer = stageCount.get("OFFER") ?? 0;
  const closed = stageCount.get("CLOSED") ?? 0;

  const interviewing = recruiter + interview;
  const total = interested + applied + recruiter + interview + offer + closed;

  const interviewRate = applied > 0 ? interviewing / applied : NaN;
  const offerRate = interviewing > 0 ? offer / interviewing : NaN;

  const activity = [
    ...recentApps.map((a) => ({
      key: `app:${a.id}:${a.updatedAt.toISOString()}`,
      date: a.updatedAt,
      title: `Updated: ${a.job.title}`,
      meta: a.job.company?.name ?? "Unknown company",
      href: `/applications/${a.id}`
    })),
    ...recentOutreach.map((e) => ({
      key: `outreach:${e.id}:${(e.sentAt ?? e.createdAt).toISOString()}`,
      date: e.sentAt ?? e.createdAt,
      title: `Outreach: ${e.subject}`,
      meta: e.application?.job.company?.name ?? "Logged outreach",
      href: e.applicationId ? `/applications/${e.applicationId}` : "/outreach"
    }))
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 8);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Dashboard"
        description="Your pipeline at a glance — what to do next, and what’s improving."
        actions={
          <>
            <Button asChild>
              <Link href="/jobs">Find jobs</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/applications">View pipeline</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/outreach">Write outreach</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Applied" value={applied} hint="Ready for follow-up" href="/applications" />
        <StatCard title="Interviewing" value={interviewing} hint={`Rate: ${pct(interviewRate)}`} href="/applications" />
        <StatCard title="Offer" value={offer} hint={`Rate: ${pct(offerRate)}`} href="/applications" />
        <StatCard title="Closed" value={closed} hint="Archived outcomes" href="/applications" />
        <StatCard title="Follow-up due" value={followUpDueCount} hint="Today / overdue" href="/applications" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="This week"
          description="Follow-ups coming due soon (next 7 days)."
        >
          {followUpWeek.length === 0 ? (
            <EmptyState
              title="No follow-ups scheduled"
              description="When you send outreach, set a follow-up date so JobTracker can keep you on pace."
              action={
                <Button asChild variant="secondary">
                  <Link href="/applications">Open Applications</Link>
                </Button>
              }
            />
          ) : (
            <div className="mt-2 space-y-2">
              {followUpWeek.map((a) => (
                <Link
                  key={a.id}
                  href={`/applications/${a.id}`}
                  className="block rounded-2xl bg-surface/55 p-3 ring-1 ring-border/60 shadow-elev-1 hover:bg-surface/80 hover:ring-border/85 transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-text">{a.job.title}</div>
                    <div className="text-xs text-muted/75">
                      Due {a.nextFollowUpAt ? fmtShort(a.nextFollowUpAt) : "—"}
                    </div>
                  </div>
                  <div className="mt-0.5 text-sm text-muted/80">
                    {a.job.company?.name ?? "Unknown company"}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card title="Insights" description="Lightweight signals that keep you motivated.">
          <div className="mt-2 grid gap-3">
            <div className="rounded-2xl bg-surface/55 p-3 ring-1 ring-border/60">
              <div className="text-xs font-medium text-muted/80">Pipeline size</div>
              <div className="mt-1 text-xl font-semibold text-text tabular-nums">{total}</div>
              <div className="mt-1 text-xs text-muted/70">Interested → Applied → Interview → Offer → Closed</div>
            </div>
            <div className="rounded-2xl bg-surface/55 p-3 ring-1 ring-border/60">
              <div className="text-xs font-medium text-muted/80">Outreach last 7 days</div>
              <div className="mt-1 text-xl font-semibold text-text tabular-nums">{outreachWeekCount}</div>
              <div className="mt-1 text-xs text-muted/70">Momentum compounds. Keep it light, keep it consistent.</div>
            </div>
            <div className="rounded-2xl bg-surface/55 p-3 ring-1 ring-border/60">
              <div className="text-xs font-medium text-muted/80">Conversion</div>
              <div className="mt-1 text-sm text-text/90">
                Interview rate: <span className="font-semibold">{pct(interviewRate)}</span>
                <br />
                Offer rate: <span className="font-semibold">{pct(offerRate)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Recent activity" description="Latest updates across your workspace.">
          {activity.length === 0 ? (
            <div className="text-sm text-muted/80">No activity yet.</div>
          ) : (
            <div className="mt-2 space-y-2">
              {activity.map((a) => (
                <Link
                  key={a.key}
                  href={a.href}
                  className="block rounded-2xl bg-surface/55 p-3 ring-1 ring-border/60 hover:bg-surface/80 hover:ring-border/85 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium text-text/90 line-clamp-1">{a.title}</div>
                    <div className="text-xs text-muted/70">{fmtShort(a.date)}</div>
                  </div>
                  <div className="mt-0.5 text-xs text-muted/70 line-clamp-1">{a.meta}</div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2" title="Pipeline snapshot" description="A mini funnel preview.">
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-surface/55 p-4 ring-1 ring-border/60">
              <div className="text-xs font-medium text-muted/80">Funnel</div>
              <div className="mt-2 space-y-2">
                {[
                  { label: "Interested", value: interested, tone: "bg-primary/20" },
                  { label: "Applied", value: applied, tone: "bg-primary/30" },
                  { label: "Interviewing", value: interviewing, tone: "bg-success/18" },
                  { label: "Offer", value: offer, tone: "bg-success/26" },
                  { label: "Closed", value: closed, tone: "bg-accent/16" }
                ].map((row) => {
                  const w = total > 0 ? Math.max(8, Math.round((row.value / total) * 100)) : 8;
                  return (
                    <div key={row.label} className="flex items-center gap-3">
                      <div className="w-24 text-xs text-muted/80">{row.label}</div>
                      <div className="flex-1">
                        <div className="h-2 rounded-full bg-surface/80 ring-1 ring-border/50 overflow-hidden">
                          <div className={`h-full ${row.tone}`} style={{ width: `${w}%` }} />
                        </div>
                      </div>
                      <div className="w-10 text-right text-xs font-semibold text-text tabular-nums">
                        {row.value}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl bg-surface/55 p-4 ring-1 ring-border/60">
              <div className="text-xs font-medium text-muted/80">Next best actions</div>
              <div className="mt-2 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-text/85">Follow-ups due</span>
                  <Link className="text-primary hover:underline" href="/applications">
                    Review
                  </Link>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text/85">Import new roles</span>
                  <Link className="text-primary hover:underline" href="/jobs">
                    Open Jobs
                  </Link>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text/85">Draft outreach</span>
                  <Link className="text-primary hover:underline" href="/outreach">
                    Compose
                  </Link>
                </div>
              </div>
              <div className="mt-3 rounded-2xl bg-primary/10 p-3 ring-1 ring-primary/15 text-xs text-muted/80">
                Tip: After every outreach, set a follow-up date — your future self will thank you.
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

