import * as React from "react";
import { cn } from "@/lib/cn";

export function SectionHeader({
  className,
  title,
  description,
  actions
}: {
  className?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-3 md:flex-row md:items-end md:justify-between", className)}>
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-text md:text-2xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted/80">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

