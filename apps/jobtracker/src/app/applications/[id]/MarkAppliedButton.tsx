"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";

export function MarkAppliedButton({ applicationId }: { applicationId: string }) {
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const [followUpDays, setFollowUpDays] = React.useState(3);

  async function mark() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/applications/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          applicationId,
          stage: "APPLIED",
          appliedAt: new Date().toISOString(),
          autoFollowUpBusinessDays: followUpDays
        })
      });
      const data = (await res.json()) as { ok?: true; error?: string };
      if (!res.ok) throw new Error(data.error || "Update failed");
      setMsg("Marked as applied.");
      // soft refresh to show updated appliedAt/stage
      window.location.reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/10">
      <div className="mb-2 text-sm font-semibold">Applied via LinkedIn</div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" disabled={loading} onClick={mark}>
          {loading ? "Saving…" : "Mark as Applied"}
        </Button>
        <div className="text-muted text-sm">
          Set follow-up in{" "}
          <input
            className="glass mx-1 w-16 rounded-xl px-2 py-1 text-sm ring-1 ring-white/10"
            type="number"
            min={1}
            max={30}
            value={followUpDays}
            onChange={(e) => setFollowUpDays(Number(e.target.value))}
          />{" "}
          business days
        </div>
      </div>
      {msg ? <div className="text-muted mt-2 text-sm">{msg}</div> : null}
    </div>
  );
}

