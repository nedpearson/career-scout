"use client";

import * as React from "react";
import Link from "next/link";
import type { ApplicationStage } from "@prisma/client";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";

export type BoardApplication = {
  id: string;
  stage: ApplicationStage;
  nextFollowUpAt: string | null;
  job: {
    title: string;
    companyName: string | null;
  };
  outreachCount: number;
  lastOutreachAt: string | null;
};

const STAGES: { key: ApplicationStage; label: string }[] = [
  { key: "INTERESTED", label: "Interested" },
  { key: "APPLIED", label: "Applied" },
  { key: "RECRUITER_SCREEN", label: "Recruiter screen" },
  { key: "INTERVIEW", label: "Interview" },
  { key: "OFFER", label: "Offer" },
  { key: "CLOSED", label: "Closed" }
];

function fmtDate(dIso?: string | null) {
  if (!dIso) return "—";
  const d = new Date(dIso);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(d);
}

export function ApplicationsBoard({ initial }: { initial: BoardApplication[] }) {
  const [apps, setApps] = React.useState<BoardApplication[]>(initial);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [busyStage, setBusyStage] = React.useState<ApplicationStage | null>(null);
  const [busyAppId, setBusyAppId] = React.useState<string | null>(null);
  const [err, setErr] = React.useState("");

  const byStage = React.useMemo(() => {
    const map = new Map<ApplicationStage, BoardApplication[]>();
    for (const s of STAGES) map.set(s.key, []);
    for (const a of apps) map.get(a.stage)?.push(a);
    return map;
  }, [apps]);

  async function moveTo(stage: ApplicationStage) {
    if (!draggingId) return;
    setErr("");
    setBusyStage(stage);
    const prev = apps;
    setApps((cur) => cur.map((a) => (a.id === draggingId ? { ...a, stage } : a)));
    try {
      const res = await fetch("/api/applications/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ applicationId: draggingId, stage })
      });
      const data = (await res.json()) as { ok?: true; error?: string };
      if (!res.ok) throw new Error(data.error || "Update failed");
    } catch (e) {
      setApps(prev);
      setErr(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyStage(null);
      setDraggingId(null);
    }
  }

  async function markApplied(applicationId: string) {
    setErr("");
    setBusyAppId(applicationId);
    const prev = apps;
    setApps((cur) =>
      cur.map((a) =>
        a.id === applicationId ? { ...a, stage: "APPLIED" as ApplicationStage } : a
      )
    );
    try {
      const res = await fetch("/api/applications/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          applicationId,
          stage: "APPLIED",
          appliedAt: new Date().toISOString(),
          autoFollowUpBusinessDays: 3
        })
      });
      const data = (await res.json()) as { ok?: true; error?: string; nextFollowUpAt?: string | null };
      if (!res.ok) throw new Error(data.error || "Update failed");
      if (data.nextFollowUpAt) {
        setApps((cur) =>
          cur.map((a) => (a.id === applicationId ? { ...a, nextFollowUpAt: data.nextFollowUpAt! } : a))
        );
      }
    } catch (e) {
      setApps(prev);
      setErr(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyAppId(null);
    }
  }

  return (
    <div>
      {err ? <div className="mb-2 text-sm text-red-300">{err}</div> : null}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {STAGES.map((s) => {
          const items = byStage.get(s.key) ?? [];
          const isBusy = busyStage === s.key;
          return (
            <div
              key={s.key}
              className={cn(
                "min-w-[280px] flex-1 rounded-2xl p-2 ring-1 ring-border/60 bg-surface/40 shadow-elev-1"
              )}
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                void moveTo(s.key);
              }}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="text-sm font-semibold text-text">
                  {s.label}{" "}
                  {isBusy ? <span className="text-xs font-normal text-muted/70">Updating…</span> : null}
                </div>
                <div className="text-xs text-muted/70 tabular-nums">{items.length}</div>
              </div>
              <div className="space-y-2">
                {items.length === 0 ? (
                  <div className="rounded-xl bg-surface/55 p-3 text-sm text-muted/80 ring-1 ring-border/60">
                    Drop here.
                  </div>
                ) : (
                  items.map((a) => (
                    <div
                      key={a.id}
                      draggable
                      onDragStart={() => setDraggingId(a.id)}
                      onDragEnd={() => setDraggingId(null)}
                      className={cn(
                        "cursor-grab rounded-xl bg-surface/55 p-3 ring-1 ring-border/60 shadow-elev-1 hover:bg-surface/80 hover:ring-border/85 transition active:cursor-grabbing",
                        draggingId === a.id ? "opacity-60" : "opacity-100"
                      )}
                      title="Drag to another column"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          className="block text-sm font-medium text-text/90 underline decoration-border/60 underline-offset-4 hover:text-text"
                          href={`/applications/${a.id}`}
                        >
                          {a.job.title}
                        </Link>
                        {a.stage !== "APPLIED" && a.stage !== "CLOSED" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={busyAppId === a.id}
                            onClick={(e) => {
                              e.preventDefault();
                              void markApplied(a.id);
                            }}
                          >
                            {busyAppId === a.id ? "…" : "Applied"}
                          </Button>
                        ) : null}
                      </div>
                      <div className="text-sm text-muted/80">{a.job.companyName ?? "Unknown company"}</div>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted/70">
                        <div>
                          Follow-up: <span className="text-text/85">{fmtDate(a.nextFollowUpAt)}</span>
                        </div>
                        <div>
                          Outreach: <span className="text-text/85 tabular-nums">{a.outreachCount}</span>{" "}
                          {a.lastOutreachAt ? `• last ${fmtDate(a.lastOutreachAt)}` : ""}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-xs text-muted/75">
        Tip: drag a card into a new column to update stage instantly.
      </div>
    </div>
  );
}

