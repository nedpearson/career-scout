import * as React from "react";
import { cn } from "@/lib/cn";

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { className?: string }) {
  return (
    <select
      className={cn(
        "w-full rounded-xl bg-surface/55 px-3 py-2 text-sm text-text shadow-elev-1 ring-1 ring-border/70 focus:outline-none focus:ring-2 focus:ring-primary/35",
        className
      )}
      {...props}
    />
  );
}

