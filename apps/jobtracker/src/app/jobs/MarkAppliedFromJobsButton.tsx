"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";

export function MarkAppliedFromJobsButton({ jobId }: { jobId: string }) {
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  async function mark() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/applications/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jobId,
          stage: "APPLIED",
          appliedAt: new Date().toISOString(),
          autoFollowUpBusinessDays: 3
        })
      });
      const data = (await res.json()) as { ok?: true; error?: string; applicationId?: string };
      if (!res.ok) throw new Error(data.error || "Update failed");
      setMsg("Applied.");
      if (data.applicationId) {
        // optional: jump to the case file
        // window.location.href = `/applications/${data.applicationId}`;
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="ghost" size="sm" disabled={loading} onClick={mark}>
        {loading ? "…" : "Mark applied"}
      </Button>
      {msg ? <span className="text-muted text-xs">{msg}</span> : null}
    </div>
  );
}

