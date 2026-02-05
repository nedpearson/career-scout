"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function StatCard({
  className,
  title,
  value,
  hint,
  href,
  icon
}: {
  className?: string;
  title: string;
  value: React.ReactNode;
  hint?: string;
  href?: string;
  icon?: React.ReactNode;
}) {
  const inner = (
    <div className={cn("surface surface-hover rounded-2xl p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-muted/80">{title}</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight text-text tabular-nums">
            {value}
          </div>
        </div>
        {icon ? (
          <div className="rounded-xl bg-surface/60 p-2 ring-1 ring-border/60">{icon}</div>
        ) : null}
      </div>
      {hint ? <div className="mt-2 text-xs text-muted/75">{hint}</div> : null}
    </div>
  );

  if (href) {
    return (
      <Link aria-label={title} href={href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

