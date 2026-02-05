"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/brand/Logo";
import { NAV_ITEMS } from "@/components/layout/nav";

function useLocalStorageBoolean(key: string, initialValue: boolean) {
  const [value, setValue] = React.useState(initialValue);
  React.useEffect(() => {
    const raw = window.localStorage.getItem(key);
    if (raw === "true") setValue(true);
    if (raw === "false") setValue(false);
  }, [key]);
  React.useEffect(() => {
    window.localStorage.setItem(key, String(value));
  }, [key, value]);
  return [value, setValue] as const;
}

export function Sidebar({
  collapsed,
  onToggleCollapsed
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const pathname = usePathname() ?? "/";
  const [pinned, setPinned] = useLocalStorageBoolean("jt.sidebarPinned", true);

  return (
    <aside className="hidden md:block">
      <div
        className={cn(
          "surface sticky top-4 flex h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl",
          collapsed ? "w-[76px]" : "w-72"
        )}
      >
        <div className={cn("flex items-center justify-between gap-2 px-3 py-3", collapsed ? "px-2" : "px-3")}>
          <Link href="/" className={cn("flex items-center gap-2", collapsed ? "justify-center" : "")}>
            <Logo compact={collapsed} />
          </Link>
          {!collapsed ? (
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-surface/55 ring-1 ring-border/60 hover:bg-surface/80 hover:ring-border/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
              aria-label="Collapse sidebar"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  d="M14 7l-5 5 5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : null}
        </div>

        <nav className={cn("flex-1 space-y-1 px-2", collapsed ? "px-2" : "px-3")}>
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm ring-1 transition",
                  collapsed ? "justify-center px-2" : "",
                  active
                    ? "bg-primary/15 text-text ring-primary/25"
                    : "bg-transparent text-text/75 ring-transparent hover:bg-surface/60 hover:text-text hover:ring-border/60"
                )}
                title={collapsed ? item.label : undefined}
              >
                <span className={cn(active ? "text-primary" : "text-text/75 group-hover:text-text")}>
                  {item.icon()}
                </span>
                {collapsed ? null : <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={cn("border-t border-border/60 p-3", collapsed ? "p-2" : "p-3")}>
          {!collapsed ? (
            <div className="rounded-2xl bg-surface/55 p-3 ring-1 ring-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-text">Pro tip</div>
                  <div className="mt-1 text-xs text-muted/80">
                    Keep 3 outreach tones. JobTracker will draft and log them for clean follow-up.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPinned(!pinned)}
                  className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-surface/55 ring-1 ring-border/60 hover:bg-surface/80"
                  aria-label={pinned ? "Unpin tip" : "Pin tip"}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      d="M14 3l7 7-2 2-2-2-3 3v6l-2-2-2 2v-6l3-3-2-2 2-2z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
              {pinned ? null : (
                <div className="mt-2 text-xs text-muted/70">
                  Tip hidden. Use the pin icon to bring it back.
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-surface/55 ring-1 ring-border/60 hover:bg-surface/80 hover:ring-border/85"
              aria-label="Expand sidebar"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  d="M10 7l5 5-5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

