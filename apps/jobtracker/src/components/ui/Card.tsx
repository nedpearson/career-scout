import * as React from "react";
import { cn } from "@/lib/cn";

export function Card({
  className,
  title,
  description,
  children
}: {
  className?: string;
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("surface rounded-2xl p-4", className)}>
      {(title || description) && (
        <header className="mb-2">
          {title && <h2 className="text-sm font-semibold text-text">{title}</h2>}
          {description && <p className="mt-0.5 text-sm text-muted/80">{description}</p>}
        </header>
      )}
      {children}
    </section>
  );
}

