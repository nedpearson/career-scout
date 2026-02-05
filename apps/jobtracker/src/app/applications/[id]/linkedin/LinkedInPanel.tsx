"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";

function sanitizeUrl(rawUrl: string | null | undefined): string | undefined {
  if (!rawUrl) {
    return undefined;
  }
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return undefined;
  }
  try {
    const url = new URL(trimmed, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    const protocol = url.protocol.toLowerCase();
    if (protocol === "http:" || protocol === "https:") {
      return trimmed;
    }
  } catch {
    // If URL construction fails, treat as unsafe.
  }
  return undefined;
}

export function LinkedInPanel({
  applicationId,
  jobTitle,
  companyName,
  location,
  myLinkedInUrl,
  initialCompanyLinkedInUrl,
  initialJobLinkedInUrl,
  initialContactLinkedInUrl,
  initialThreadLinkedInUrl
}: {
  applicationId: string;
  jobTitle: string;
  companyName: string;
  location?: string | null;
  myLinkedInUrl?: string | null;
  initialCompanyLinkedInUrl?: string | null;
  initialJobLinkedInUrl?: string | null;
  initialContactLinkedInUrl?: string | null;
  initialThreadLinkedInUrl?: string | null;
}) {
  const [companyUrl, setCompanyUrl] = React.useState(initialCompanyLinkedInUrl ?? "");
  const [jobUrl, setJobUrl] = React.useState(initialJobLinkedInUrl ?? "");
  const [contactUrl, setContactUrl] = React.useState(initialContactLinkedInUrl ?? "");
  const [threadUrl, setThreadUrl] = React.useState(initialThreadLinkedInUrl ?? "");

  const safeCompanyUrl = sanitizeUrl(companyUrl);
  const safeJobUrl = sanitizeUrl(jobUrl);
  const safeContactUrl = sanitizeUrl(contactUrl);
  const safeThreadUrl = sanitizeUrl(threadUrl);

  const [tone, setTone] = React.useState<"WARM" | "NEUTRAL" | "DIRECT">("NEUTRAL");
  const [humanLevel, setHumanLevel] = React.useState(70);
  const [extra, setExtra] = React.useState("");

  const [drafting, setDrafting] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [msg, setMsg] = React.useState("");

  const linkedInJobSearchUrl = React.useMemo(() => {
    const u = new URL("https://www.linkedin.com/jobs/search/");
    u.searchParams.set("keywords", jobTitle);
    if (location) u.searchParams.set("location", location);
    return u.toString();
  }, [jobTitle, location]);

  const linkedInPeopleSearchUrl = React.useMemo(() => {
    const u = new URL("https://www.linkedin.com/search/results/people/");
    u.searchParams.set("keywords", `${companyName} recruiter hiring manager ${jobTitle}`);
    return u.toString();
  }, [companyName, jobTitle]);

  async function saveLinks() {
    setMsg("");
    try {
      const res = await fetch("/api/applications/linkedin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          applicationId,
          companyLinkedInUrl: companyUrl || null,
          jobLinkedInUrl: jobUrl || null,
          contactLinkedInUrl: contactUrl || null,
          threadLinkedInUrl: threadUrl || null
        })
      });
      const data = (await res.json()) as { ok?: true; error?: string };
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMsg("Saved.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function generate() {
    setDrafting(true);
    setMsg("");
    try {
      const res = await fetch("/api/ai/linkedin-message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ applicationId, tone, humanLevel, extraNotes: extra })
      });
      const data = (await res.json()) as { messageText?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Draft failed");
      setDraft(data.messageText ?? "");
      setMsg("Draft generated. Copy/paste into LinkedIn.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Draft failed");
    } finally {
      setDrafting(false);
    }
  }

  async function copy() {
    setMsg("");
    try {
      await navigator.clipboard.writeText(draft);
      setMsg("Copied to clipboard.");
    } catch {
      setMsg("Copy failed (browser blocked clipboard). Select and copy manually.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {myLinkedInUrl ? (
          <a
            className="glass rounded-xl px-3 py-2 text-sm ring-1 ring-white/10 hover:bg-white/10"
            href={myLinkedInUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open my LinkedIn
          </a>
        ) : null}
        <a
          className="glass rounded-xl px-3 py-2 text-sm ring-1 ring-white/10 hover:bg-white/10"
          href={linkedInJobSearchUrl}
          target="_blank"
          rel="noreferrer"
        >
          Find this job on LinkedIn
        </a>
        <a
          className="glass rounded-xl px-3 py-2 text-sm ring-1 ring-white/10 hover:bg-white/10"
          href={linkedInPeopleSearchUrl}
          target="_blank"
          rel="noreferrer"
        >
          Find recruiter / HM
        </a>
        {safeJobUrl ? (
          <a
            className="glass rounded-xl px-3 py-2 text-sm ring-1 ring-white/10 hover:bg-white/10"
            href={safeJobUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open LinkedIn posting
          </a>
        ) : null}
        {safeThreadUrl ? (
          <a
            className="glass rounded-xl px-3 py-2 text-sm ring-1 ring-white/10 hover:bg-white/10"
            href={safeThreadUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open LinkedIn thread
          </a>
        ) : null}
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <Input
          placeholder="Company LinkedIn URL (optional)"
          value={companyUrl}
          onChange={(e) => setCompanyUrl(e.target.value)}
        />
        <Input
          placeholder="LinkedIn job posting URL (optional)"
          value={jobUrl}
          onChange={(e) => setJobUrl(e.target.value)}
        />
        <Input
          placeholder="Recruiter/contact LinkedIn URL (optional)"
          value={contactUrl}
          onChange={(e) => setContactUrl(e.target.value)}
        />
        <Input
          placeholder="LinkedIn message thread URL (optional)"
          value={threadUrl}
          onChange={(e) => setThreadUrl(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="secondary" onClick={saveLinks}>
          Save LinkedIn links
        </Button>
        {msg ? <div className="text-muted text-sm">{msg}</div> : null}
      </div>

      <div className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/10">
        <div className="mb-2 text-sm font-semibold">LinkedIn message (copy/paste)</div>
        <div className="grid gap-2 md:grid-cols-3 md:items-center">
          <div>
            <div className="text-muted mb-1 text-xs">Tone</div>
            <Select value={tone} onChange={(e) => setTone(e.target.value as any)}>
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
        <Textarea
          className="mt-2"
          placeholder="Extra notes (optional): referral, 1 key project, specific ask…"
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={drafting} onClick={generate}>
            {drafting ? "Generating…" : "Generate LinkedIn message (AI)"}
          </Button>
          <Button type="button" disabled={!draft} onClick={copy}>
            Copy message
          </Button>
        </div>
        <Textarea className="mt-2" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <div className="text-muted mt-1 text-xs">
          Note: this app will open LinkedIn and generate copy, but it won’t auto-send messages or auto-apply.
        </div>
      </div>
    </div>
  );
}

