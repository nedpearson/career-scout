"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";

export function ScoreButton({ jobId }: { jobId?: string }) {
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  async function run() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/jobs/score", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(jobId ? { jobId } : {})
      });
      const data = (await res.json()) as { updated?: number; error?: string };
      if (!res.ok) throw new Error(data.error || "Scoring failed");
      setMsg(jobId ? "Scored." : `Scored ${data.updated} jobs.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Scoring failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant={jobId ? "ghost" : "secondary"}
        size="sm"
        onClick={run}
        disabled={loading}
      >
        {loading ? "Scoring…" : jobId ? "Score" : "Recalculate scores"}
      </Button>
      {msg ? <span className="text-muted text-xs">{msg}</span> : null}
    </div>
  );
}

