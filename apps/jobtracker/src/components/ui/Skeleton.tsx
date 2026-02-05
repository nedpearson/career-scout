import * as React from "react";
import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-surface/70 ring-1 ring-border/50",
        className
      )}
    />
  );
}

