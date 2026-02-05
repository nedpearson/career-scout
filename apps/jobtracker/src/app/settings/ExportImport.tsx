"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";

export function ExportImport() {
  const [msg, setMsg] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function downloadExport() {
    setMsg("");
    const res = await fetch("/api/export");
    const data = await res.json();
    if (!res.ok) {
      setMsg(data?.error || "Export failed");
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Export downloaded.");
  }

  async function importFile() {
    setMsg("");
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setMsg("Pick a JSON file first.");
      return;
    }
    const text = await file.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      setMsg("Invalid JSON file.");
      return;
    }

    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(json)
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data?.error || "Import failed");
      return;
    }
    setMsg(
      `Imported jobs: ${data.importedJobs ?? 0}, applications: ${data.importedApplications ?? 0}, outreach: ${data.importedOutreach ?? 0}.`
    );
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={downloadExport}>
          Download export (JSON)
        </Button>
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <input
          ref={fileRef}
          className="glass w-full rounded-xl px-3 py-2 text-sm ring-1 ring-white/10"
          type="file"
          accept="application/json"
        />
        <Button type="button" onClick={importFile}>
          Import JSON
        </Button>
      </div>
      <div className="text-muted text-xs">
        Import merges into your current account (it does not touch auth tokens).
      </div>
      {msg ? <div className="text-muted text-sm">{msg}</div> : null}
    </div>
  );
}

