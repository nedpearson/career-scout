"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type SerpJobResult = {
  title: string;
  company_name?: string;
  location?: string;
  via?: string;
  description?: string;
  related_links?: { link: string }[];
};

export function SearchSerpApi() {
  const [query, setQuery] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [importing, setImporting] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState("");
  const [results, setResults] = React.useState<SerpJobResult[]>([]);

  async function search() {
    setLoading(true);
    setMsg("");
    setResults([]);
    try {
      const res = await fetch("/api/jobs/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: query.trim(), location: location.trim() || undefined })
      });
      const data = (await res.json()) as { ok?: true; results?: SerpJobResult[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResults(data.results ?? []);
      setMsg(`Found ${data.results?.length ?? 0} results.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function importOne(r: SerpJobResult) {
    const companyName = r.company_name?.trim() || "Unknown company";
    const sourceUrl = r.related_links?.[0]?.link;
    setImporting(sourceUrl ?? r.title);
    setMsg("");
    try {
      const res = await fetch("/api/jobs/import/serpapi", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: r.title,
          companyName,
          location: r.location,
          via: r.via,
          sourceUrl,
          description: r.description
        })
      });
      const data = (await res.json()) as { ok?: true; jobId?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Import failed");
      setMsg("Imported into your Jobs list.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-3 md:items-center">
        <Input
          placeholder="Search query (e.g. 'React developer', 'Project Manager')"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Input
          placeholder="Location (optional, e.g. Austin, TX)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <Button type="button" variant="secondary" onClick={search} disabled={loading || query.trim().length < 2}>
          {loading ? "Searching…" : "Search other platforms"}
        </Button>
      </div>
      <div className="text-muted text-xs">
        Uses SerpAPI (optional). Configure `SERPAPI_API_KEY` in `.env` to enable.
      </div>
      {msg ? <div className="text-muted text-sm">{msg}</div> : null}

      {results.length ? (
        <div className="space-y-2">
          {results.slice(0, 15).map((r) => {
            const companyName = r.company_name?.trim() || "Unknown company";
            const link = r.related_links?.[0]?.link;
            return (
              <div key={(link ?? r.title) + companyName} className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium">{r.title}</div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={Boolean(importing)}
                    onClick={() => void importOne(r)}
                  >
                    {importing === (link ?? r.title) ? "Importing…" : "Import"}
                  </Button>
                </div>
                <div className="text-muted text-sm">
                  {companyName}
                  {r.location ? ` • ${r.location}` : ""}
                  {r.via ? ` • via ${r.via}` : ""}
                </div>
                {link ? (
                  <a className="text-xs text-white/70 underline decoration-white/20 underline-offset-4" href={link} target="_blank" rel="noreferrer">
                    Open result
                  </a>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

