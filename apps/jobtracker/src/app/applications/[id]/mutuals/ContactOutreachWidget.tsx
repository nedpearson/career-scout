"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";

type Channel = "EMAIL" | "LINKEDIN" | "FACEBOOK" | "INSTAGRAM";

export function ContactOutreachWidget({
  applicationId,
  contactId,
  defaultEmail
}: {
  applicationId: string;
  contactId: string;
  defaultEmail?: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  const [channel, setChannel] = React.useState<Channel>("LINKEDIN");
  const [tone, setTone] = React.useState<"WARM" | "NEUTRAL" | "DIRECT">("NEUTRAL");
  const [humanLevel, setHumanLevel] = React.useState(70);
  const [extraNotes, setExtraNotes] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [msg, setMsg] = React.useState("");

  async function run() {
    setLoading(true);
    setMsg("");
    setSubject("");
    setBody("");
    try {
      const res = await fetch("/api/ai/contact-outreach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ applicationId, contactId, channel, tone, humanLevel, extraNotes })
      });
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data.error || "Draft failed");

      if (channel === "EMAIL") {
        setSubject(data.subject ?? "");
        setBody(data.bodyText ?? "");
      } else {
        setBody(data.messageText ?? "");
      }
      setMsg("Draft generated.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Draft failed");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(channel === "EMAIL" ? `${subject}\n\n${body}` : body);
      setMsg("Copied.");
    } catch {
      setMsg("Copy failed (browser blocked clipboard).");
    }
  }

  const emailHref =
    channel === "EMAIL" && defaultEmail
      ? `/outreach?applicationId=${applicationId}&to=${encodeURIComponent(defaultEmail)}&subject=${encodeURIComponent(
          subject
        )}&bodyText=${encodeURIComponent(body)}`
      : null;

  return (
    <div className="mt-2">
      <button
        className="text-xs text-white/70 underline decoration-white/20 underline-offset-4"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        {open ? "Hide outreach generator" : "Generate outreach"}
      </button>

      {open ? (
        <div className="mt-2 rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/10">
          <div className="grid gap-2 md:grid-cols-3 md:items-center">
            <div>
              <div className="text-muted mb-1 text-xs">Channel</div>
              <Select value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
                <option value="LINKEDIN">LinkedIn DM</option>
                <option value="FACEBOOK">Facebook DM</option>
                <option value="INSTAGRAM">Instagram DM</option>
                <option value="EMAIL">Email (via Gmail)</option>
              </Select>
            </div>
            <div>
              <div className="text-muted mb-1 text-xs">Tone</div>
              <Select value={tone} onChange={(e) => setTone(e.target.value as any)}>
                <option value="WARM">Warm</option>
                <option value="NEUTRAL">Neutral</option>
                <option value="DIRECT">Direct</option>
              </Select>
            </div>
            <div>
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
            placeholder="Extra notes (optional): how you know them, what you want, referral context…"
            value={extraNotes}
            onChange={(e) => setExtraNotes(e.target.value)}
          />

          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={loading} onClick={run}>
              {loading ? "Generating…" : "Generate"}
            </Button>
            <Button type="button" disabled={!body} onClick={copy}>
              Copy
            </Button>
            {emailHref ? (
              <a className="glass rounded-xl px-3 py-2 text-sm ring-1 ring-white/10 hover:bg-white/10" href={emailHref}>
                Open in Outreach (email)
              </a>
            ) : null}
            {msg ? <div className="text-muted text-sm">{msg}</div> : null}
          </div>

          {channel === "EMAIL" ? (
            <div className="mt-2 grid gap-2">
              <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
          ) : (
            <div className="mt-2">
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

