"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";

type DeepDivePayload = {
  baseline?: { score: number; notes: string; matchedSkills: string[] };
  report?: {
    fitScore?: number;
    strengths?: string[];
    gaps?: string[];
    missingSkills?: string[];
    resumeTweaks?: string[];
    interviewAngles?: string[];
    outreachHooks?: string[];
    questionsToAsk?: string[];
  };
};

function parseDeepDive(s: string | null): DeepDivePayload | null {
  if (!s) return null;
  try {
    const parsed = JSON.parse(s) as any;
    // stored shape: { baseline, report }
    if (parsed?.report || parsed?.baseline) return parsed as DeepDivePayload;
    return null;
  } catch {
    return null;
  }
}

function List({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold text-white/80">{title}</div>
      <ul className="text-muted list-disc space-y-1 pl-5 text-sm">
        {items.slice(0, 8).map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  );
}

export function JobDeepDivePanel({
  jobId,
  initialAiDeepDive
}: {
  jobId: string;
  initialAiDeepDive: string | null;
}) {
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const [data, setData] = React.useState<DeepDivePayload | null>(() => parseDeepDive(initialAiDeepDive));

  async function run() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/ai/job-deep-dive", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId })
      });
      const json = (await res.json()) as { ok?: true; baseline?: any; report?: any; error?: string };
      if (!res.ok) throw new Error(json.error || "Deep dive failed");
      setData({ baseline: json.baseline, report: json.report });
      setMsg("Deep dive updated.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Deep dive failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-muted text-sm">
          {data?.report?.fitScore != null ? (
            <>
              Fit score: <span className="font-semibold text-white/80">{data.report.fitScore}/100</span>
            </>
          ) : (
            "No deep dive saved yet."
          )}
        </div>
        <Button type="button" variant="secondary" onClick={run} disabled={loading}>
          {loading ? "Running…" : "Run deep dive"}
        </Button>
      </div>
      {msg ? <div className="text-muted text-sm">{msg}</div> : null}

      {data?.baseline ? (
        <div className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/10">
          <div className="text-xs font-semibold text-white/80">Baseline (fast score)</div>
          <div className="text-muted mt-1 text-sm">
            {data.baseline.score}/100 • {data.baseline.notes}
          </div>
        </div>
      ) : null}

      {data?.report ? (
        <div className="grid gap-3">
          <List title="Strengths" items={data.report.strengths} />
          <List title="Gaps / risks (and how to handle)" items={data.report.gaps} />
          <List title="Missing skills keywords" items={data.report.missingSkills} />
          <List title="Interview angles" items={data.report.interviewAngles} />
          <List title="Outreach hooks" items={data.report.outreachHooks} />
          <List title="Questions to ask" items={data.report.questionsToAsk} />
        </div>
      ) : null}
    </div>
  );
}

