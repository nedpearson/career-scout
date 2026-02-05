import { env } from "@/lib/env";

export type SerpJobResult = {
  title: string;
  company_name?: string;
  location?: string;
  via?: string;
  description?: string;
  related_links?: { link: string }[];
  thumbnail?: string;
};

/**
 * Connector scaffold for broader job search (Indeed, LinkedIn, Google Jobs, etc.).
 *
 * IMPORTANT:
 * - Many platforms prohibit scraping.
 * - This connector is BYO key and should only be used with providers you have rights to use.
 */
export async function searchJobsViaSerpApi({
  query,
  location
}: {
  query: string;
  location?: string;
}): Promise<SerpJobResult[]> {
  if (!env.SERPAPI_API_KEY) {
    throw new Error("SERPAPI_API_KEY not set");
  }

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_jobs");
  url.searchParams.set("q", query);
  if (location) url.searchParams.set("location", location);
  url.searchParams.set("api_key", env.SERPAPI_API_KEY);

  const res = await fetch(url.toString(), { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`SerpAPI failed: ${res.status}`);
  const json = (await res.json()) as any;
  return (json.jobs_results ?? []) as SerpJobResult[];
}

