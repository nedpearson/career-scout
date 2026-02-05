import * as React from "react";
import { cn } from "@/lib/cn";

type AlertVariant = "info" | "success" | "danger";

const variants: Record<AlertVariant, string> = {
  info: "bg-primary/10 text-text ring-primary/20",
  success: "bg-success/10 text-text ring-success/20",
  danger: "bg-red-500/10 text-text ring-red-500/20"
};

export function Alert({
  className,
  variant = "info",
  children
}: {
  className?: string;
  variant?: AlertVariant;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl p-3 text-sm ring-1", variants[variant], className)}>
      {children}
    </div>
  );
}

