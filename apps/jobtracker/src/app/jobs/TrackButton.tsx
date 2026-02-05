"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";

export function TrackButton({ jobId }: { jobId: string }) {
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  async function track() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/applications/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId })
      });
      const data = (await res.json()) as { ok?: true; error?: string; created?: boolean };
      if (!res.ok) throw new Error(data.error || "Track failed");
      setMsg(data.created ? "Tracked." : "Already tracked.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Track failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="ghost" size="sm" disabled={loading} onClick={track}>
        {loading ? "…" : "Track"}
      </Button>
      {msg ? <span className="text-muted text-xs">{msg}</span> : null}
    </div>
  );
}

