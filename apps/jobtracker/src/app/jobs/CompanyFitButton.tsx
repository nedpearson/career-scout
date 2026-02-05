"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";

export function CompanyFitButton({ jobId }: { jobId: string }) {
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  async function run() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/ai/company-fit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId })
      });
      const data = (await res.json()) as { summary?: any; error?: string };
      if (!res.ok) throw new Error(data.error || "Company fit failed");
      setMsg("Company fit generated.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Company fit failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="ghost" size="sm" disabled={loading} onClick={run}>
        {loading ? "…" : "Company fit"}
      </Button>
      {msg ? <span className="text-muted text-xs">{msg}</span> : null}
    </div>
  );
}

