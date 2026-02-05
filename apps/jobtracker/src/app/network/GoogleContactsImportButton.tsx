"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";

export function GoogleContactsImportButton() {
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  async function run() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/google/contacts/import", { method: "POST" });
      const data = (await res.json()) as { ok?: true; imported?: number; total?: number; error?: string };
      if (!res.ok) throw new Error(data.error || "Import failed");
      setMsg(`Imported ${data.imported ?? 0} new contacts (scanned ${data.total ?? 0}).`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="secondary" onClick={run} disabled={loading}>
        {loading ? "Importing…" : "Import Google Contacts"}
      </Button>
      {msg ? <div className="text-muted text-sm">{msg}</div> : null}
    </div>
  );
}

