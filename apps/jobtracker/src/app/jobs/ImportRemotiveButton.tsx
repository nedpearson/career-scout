"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function ImportRemotiveButton() {
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [result, setResult] = React.useState<string>("");

  async function runImport() {
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/jobs/import/remotive", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ search: search.trim() || undefined })
      });
      const data = (await res.json()) as { imported?: number; upserted?: number; error?: string };
      if (!res.ok) throw new Error(data.error || "Import failed");
      setResult(`Imported ${data.imported} jobs (upserted ${data.upserted}).`);
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center">
      <Input
        placeholder="Optional keyword (e.g. React, Cybersecurity, Sales)"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Button type="button" onClick={runImport} disabled={loading}>
        {loading ? "Importing…" : "Import from Remotive"}
      </Button>
      {result ? <div className="text-muted text-sm">{result}</div> : null}
    </div>
  );
}

