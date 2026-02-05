"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";

export function DeepDiveButton({ jobId }: { jobId: string }) {
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  async function run() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/ai/job-deep-dive", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId })
      });
      const data = (await res.json()) as { ok?: true; error?: string };
      if (!res.ok) throw new Error(data.error || "Deep dive failed");
      setMsg("Deep dive saved.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Deep dive failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="ghost" size="sm" disabled={loading} onClick={run}>
        {loading ? "…" : "Deep dive"}
      </Button>
      {msg ? <span className="text-muted text-xs">{msg}</span> : null}
    </div>
  );
}

