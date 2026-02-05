import * as React from "react";
import { cn } from "@/lib/cn";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-28 w-full resize-y rounded-xl bg-surface/55 px-3 py-2 text-sm text-text shadow-elev-1 ring-1 ring-border/70 placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/35",
        className
      )}
      {...props}
    />
  );
});

