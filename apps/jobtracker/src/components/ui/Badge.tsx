import * as React from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "default" | "primary" | "success" | "accent";

const variants: Record<BadgeVariant, string> = {
  default: "bg-surface/70 text-text/80 ring-border/70",
  primary: "bg-primary/15 text-primary ring-primary/25",
  success: "bg-success/15 text-success ring-success/25",
  accent: "bg-accent/15 text-accent ring-accent/25"
};

export function Badge({
  className,
  variant = "default",
  children
}: {
  className?: string;
  variant?: BadgeVariant;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

