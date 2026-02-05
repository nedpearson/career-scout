import * as React from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  className,
  title,
  description,
  action
}: {
  className?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl bg-surface/55 p-5 ring-1 ring-border/60", className)}>
      <div className="text-sm font-semibold text-text">{title}</div>
      {description ? <div className="mt-1 text-sm text-muted/80">{description}</div> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

