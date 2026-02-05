import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { ImportRemotiveButton } from "./ImportRemotiveButton";
import { WorkMode } from "@prisma/client";
import { ScoreButton } from "./ScoreButton";
import { CompanyFitButton } from "./CompanyFitButton";
import { TrackButton } from "./TrackButton";
import { SearchSerpApi } from "./SearchSerpApi";
import { DeepDiveButton } from "./DeepDiveButton";
import { LinkedInJobButton } from "./LinkedInJobButton";
import { MarkAppliedFromJobsButton } from "./MarkAppliedFromJobsButton";

export default async function JobsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const sp = (await searchParams) ?? {};
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const mode = typeof sp.mode === "string" ? sp.mode : "ANY";

  const where = {
    userId,
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { company: { name: { contains: q, mode: "insensitive" as const } } }
          ]
        }
      : {}),
    ...(mode !== "ANY" ? { workMode: mode as WorkMode } : {})
  };

  const jobs = await prisma.job.findMany({
    where,
    include: { company: true },
    orderBy: { updatedAt: "desc" },
    take: 50
  });

  return (
    <div className="space-y-4">
      <Card title="Jobs" description="Import + filter + shortlist + score fit.">
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <Badge>Remote</Badge>
          <Badge>Hybrid</Badge>
          <Badge>Local</Badge>
          <span className="text-muted">• Starting with Remotive import</span>
        </div>
        <div className="mt-3">
          <ImportRemotiveButton />
        </div>
        <div className="mt-3">
          <SearchSerpApi />
        </div>
        <div className="mt-3">
          <ScoreButton />
        </div>
      </Card>

      <Card title="Filters" description="Keyword + location type. More filters next.">
        <form className="mt-2 grid gap-2 md:grid-cols-3" action="/jobs">
          <Input name="q" defaultValue={q} placeholder="Search title or company…" />
          <Select name="mode" defaultValue={mode}>
            <option value="ANY">Any work mode</option>
            <option value="REMOTE">Remote</option>
            <option value="HYBRID">Hybrid</option>
            <option value="ONSITE">Onsite / Local</option>
          </Select>
          <button className="glass rounded-xl px-3 py-2 text-sm ring-1 ring-white/10 hover:bg-white/10">
            Apply
          </button>
        </form>
      </Card>

      <Card
        title={`Results (${jobs.length}${jobs.length === 50 ? "+" : ""})`}
        description="Latest saved/imported jobs for your account."
      >
        {jobs.length === 0 ? (
          <div className="text-muted text-sm">
            No jobs yet. Import some above or add via a posting link (coming next).
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex flex-col gap-1 rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/10 hover:bg-white/[0.05] transition"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">{job.title}</div>
                  <div className="text-xs text-white/60">
                    {job.workMode ?? "—"} {job.source ? `• ${job.source}` : ""}
                  </div>
                </div>
                <div className="text-muted text-sm">
                  {job.company?.name ?? "Unknown company"}
                  {job.location ? ` • ${job.location}` : ""}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-white/60">
                    Match:{" "}
                    <span className="font-semibold text-white/80">
                      {job.matchScore ?? "—"}{typeof job.matchScore === "number" ? "/100" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrackButton jobId={job.id} />
                    <MarkAppliedFromJobsButton jobId={job.id} />
                    <LinkedInJobButton
                      title={job.title}
                      companyName={job.company?.name ?? null}
                      location={job.location}
                    />
                    <CompanyFitButton jobId={job.id} />
                    <DeepDiveButton jobId={job.id} />
                    <ScoreButton jobId={job.id} />
                  </div>
                </div>
                {job.matchNotes ? <div className="text-muted text-xs">{job.matchNotes}</div> : null}
                {job.sourceUrl ? (
                  <a
                    className="text-xs text-white/70 underline decoration-white/20 underline-offset-4"
                    href={job.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open posting
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

