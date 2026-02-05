import { WorkMode } from "@prisma/client";

type RemotiveJob = {
  id: number;
  url: string;
  title: string;
  company_name: string;
  company_logo_url?: string | null;
  category?: string | null;
  job_type?: string | null;
  publication_date?: string | null;
  candidate_required_location?: string | null;
  salary?: string | null;
  description?: string | null;
};

export type NormalizedJob = {
  source: string;
  externalId: string;
  sourceUrl: string;
  title: string;
  companyName: string;
  location?: string;
  workMode?: WorkMode;
  employmentType?: string;
  description?: string;
};

export async function fetchRemotiveJobs({
  search
}: {
  search?: string;
}): Promise<NormalizedJob[]> {
  const url = new URL("https://remotive.com/api/remote-jobs");
  if (search) url.searchParams.set("search", search);

  const res = await fetch(url.toString(), {
    headers: { accept: "application/json" }
  });
  if (!res.ok) throw new Error(`Remotive fetch failed: ${res.status}`);
  const data = (await res.json()) as { jobs: RemotiveJob[] };

  return (data.jobs ?? []).map((j) => ({
    source: "remotive",
    externalId: String(j.id),
    sourceUrl: j.url,
    title: j.title,
    companyName: j.company_name,
    location: j.candidate_required_location ?? "Remote",
    workMode: WorkMode.REMOTE,
    employmentType: j.job_type ?? undefined,
    description: j.description ?? undefined
  }));
}

