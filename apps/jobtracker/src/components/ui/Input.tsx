import * as React from "react";
import { cn } from "@/lib/cn";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { className?: string }
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-xl bg-surface/55 px-3 py-2 text-sm text-text shadow-elev-1 ring-1 ring-border/70 placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/35",
        className
      )}
      {...props}
    />
  );
});

