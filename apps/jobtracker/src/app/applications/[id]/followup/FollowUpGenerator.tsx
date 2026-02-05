"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

export function FollowUpGenerator({
  applicationId,
  toEmail,
  defaultTone
}: {
  applicationId: string;
  toEmail?: string;
  defaultTone: "WARM" | "NEUTRAL" | "DIRECT";
}) {
  const [tone, setTone] = React.useState(defaultTone);
  const [humanLevel, setHumanLevel] = React.useState(70);
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  async function generate() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/ai/followup-draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ applicationId, tone, humanLevel })
      });
      const data = (await res.json()) as { subject?: string; bodyText?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Follow-up draft failed");

      const url = new URL(window.location.origin + "/outreach");
      url.searchParams.set("applicationId", applicationId);
      if (toEmail) url.searchParams.set("to", toEmail);
      if (data.subject) url.searchParams.set("subject", data.subject);
      if (data.bodyText) url.searchParams.set("bodyText", data.bodyText);
      window.location.href = url.toString();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Follow-up draft failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/10">
      <div className="mb-2 text-sm font-semibold">Follow-up (agency style)</div>
      <div className="grid gap-2 md:grid-cols-3 md:items-end">
        <div className="md:col-span-1">
          <div className="text-muted mb-1 text-xs">Tone</div>
          <Select value={tone} onChange={(e) => setTone(e.target.value as typeof tone)}>
            <option value="WARM">Warm</option>
            <option value="NEUTRAL">Neutral</option>
            <option value="DIRECT">Direct</option>
          </Select>
        </div>
        <div className="md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="text-muted mb-1 text-xs">Human-sounding</div>
            <div className="text-muted text-xs">{humanLevel}/100</div>
          </div>
          <input
            className="w-full accent-white"
            type="range"
            min={0}
            max={100}
            value={humanLevel}
            onChange={(e) => setHumanLevel(Number(e.target.value))}
          />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <Button type="button" variant="secondary" onClick={generate} disabled={loading}>
          {loading ? "Generating…" : "Generate follow-up & open composer"}
        </Button>
        {msg ? <div className="text-muted text-sm">{msg}</div> : null}
      </div>
    </div>
  );
}

