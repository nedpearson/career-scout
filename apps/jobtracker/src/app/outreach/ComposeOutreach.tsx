"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

export function ComposeOutreach({
  applicationId,
  initialTo,
  initialCc,
  initialSubject,
  initialBodyText
}: {
  applicationId?: string;
  initialTo?: string;
  initialCc?: string;
  initialSubject?: string;
  initialBodyText?: string;
}) {
  const [loading, setLoading] = React.useState(false);
  const [drafting, setDrafting] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  const [tone, setTone] = React.useState<"WARM" | "NEUTRAL" | "DIRECT">("NEUTRAL");
  const [humanLevel, setHumanLevel] = React.useState(70);
  const [companyName, setCompanyName] = React.useState("");
  const [roleTitle, setRoleTitle] = React.useState("");
  const [extraNotes, setExtraNotes] = React.useState("");
  const [autoFollowUp, setAutoFollowUp] = React.useState(Boolean(applicationId));
  const [autoFollowUpDays, setAutoFollowUpDays] = React.useState(3);

  const toRef = React.useRef<HTMLInputElement>(null);
  const ccRef = React.useRef<HTMLInputElement>(null);
  const subjectRef = React.useRef<HTMLInputElement>(null);
  const bodyRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (initialTo && toRef.current) toRef.current.value = initialTo;
    if (initialCc && ccRef.current) ccRef.current.value = initialCc;
    if (initialSubject && subjectRef.current) subjectRef.current.value = initialSubject;
    if (initialBodyText && bodyRef.current) bodyRef.current.value = initialBodyText;
  }, [initialTo, initialCc, initialSubject, initialBodyText]);

  async function generateDraft() {
    setDrafting(true);
    setMsg("");
    try {
      const res = await fetch("/api/ai/outreach-draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tone, humanLevel, companyName, roleTitle, extraNotes })
      });
      const data = (await res.json()) as { subject?: string; bodyText?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Draft failed");
      if (subjectRef.current) subjectRef.current.value = data.subject ?? "";
      if (bodyRef.current) bodyRef.current.value = data.bodyText ?? "";
      setMsg("Draft generated. Review, tweak, then send.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Draft failed");
    } finally {
      setDrafting(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const fd = new FormData(e.currentTarget);
    const payload = {
      to: String(fd.get("to") ?? ""),
      cc: String(fd.get("cc") ?? "") || undefined,
      subject: String(fd.get("subject") ?? ""),
      bodyText: String(fd.get("bodyText") ?? ""),
      applicationId,
      autoFollowUpBusinessDays:
        applicationId && autoFollowUp ? Math.max(1, Math.min(30, autoFollowUpDays)) : undefined,
      tone,
      humanLevel
    };
    try {
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = (await res.json()) as { ok?: true; error?: string; gmailMessageId?: string };
      if (!res.ok) throw new Error(data.error || "Send failed");
      setMsg(`Sent (Gmail id: ${data.gmailMessageId}).`);
      e.currentTarget.reset();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Send failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-2 md:grid-cols-2">
        <Input
          placeholder="Company (optional, helps AI draft)"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />
        <Input
          placeholder="Role title (optional, helps AI draft)"
          value={roleTitle}
          onChange={(e) => setRoleTitle(e.target.value)}
        />
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <Input
          ref={toRef}
          name="to"
          type="email"
          placeholder="To (recruiter/hiring manager email)"
          required
        />
        <Input ref={ccRef} name="cc" type="email" placeholder="CC (optional)" />
      </div>
      <Input ref={subjectRef} name="subject" placeholder="Subject" required />
      <Textarea ref={bodyRef} name="bodyText" placeholder="Write your message…" required />
      <Textarea
        placeholder="Extra notes for AI (optional): key projects, referral source, specific ask…"
        value={extraNotes}
        onChange={(e) => setExtraNotes(e.target.value)}
      />

      {applicationId ? (
        <div className="grid gap-2 rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/10 md:grid-cols-3 md:items-center">
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input
              className="accent-white"
              type="checkbox"
              checked={autoFollowUp}
              onChange={(e) => setAutoFollowUp(e.target.checked)}
            />
            Auto-set next follow-up
          </label>
          <div className="text-muted text-xs md:col-span-2">
            {autoFollowUp ? (
              <div className="flex flex-wrap items-center gap-2">
                <span>After send, set follow-up in</span>
                <input
                  className="glass w-20 rounded-xl px-3 py-2 text-sm ring-1 ring-white/10"
                  type="number"
                  min={1}
                  max={30}
                  value={autoFollowUpDays}
                  onChange={(e) => setAutoFollowUpDays(Number(e.target.value))}
                />
                <span>business days.</span>
              </div>
            ) : (
              <span>Disabled (won’t change your follow-up date).</span>
            )}
          </div>
        </div>
      ) : null}

      <div className="grid gap-2 md:grid-cols-3 md:items-center">
        <div>
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

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button type="button" variant="secondary" disabled={drafting} onClick={generateDraft}>
            {drafting ? "Drafting…" : "Generate with AI"}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Sending…" : "Send via Gmail"}
          </Button>
        </div>
        {msg ? <div className="text-muted text-sm">{msg}</div> : null}
      </div>
    </form>
  );
}

