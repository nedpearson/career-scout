"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { NAV_ITEMS } from "./nav";

export function BottomNav() {
  const pathname = usePathname() ?? "/";
  const items = NAV_ITEMS.filter((i) => i.mobile);

  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-bg/80 backdrop-blur md:hidden"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-2 py-2">
        {items.map((i) => {
          const active = i.href === "/" ? pathname === "/" : pathname.startsWith(i.href);
          return (
            <Link
              key={i.href}
              href={i.href}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] text-muted/80",
                active ? "text-text" : "hover:text-text/90"
              )}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-transparent",
                  active ? "bg-primary/15 text-primary ring-primary/25" : "bg-surface/40 text-text/80 ring-border/40"
                )}
              >
                {i.icon()}
              </span>
              {i.shortLabel}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

