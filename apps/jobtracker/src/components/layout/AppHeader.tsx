"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { NAV_ITEMS, getNavLabel } from "./nav";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Logo } from "@/components/brand/Logo";

function IconButton({
  "aria-label": ariaLabel,
  children,
  onClick
}: {
  "aria-label": string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-surface/55 ring-1 ring-border/60 shadow-elev-1 hover:bg-surface/80 hover:ring-border/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
    >
      {children}
    </button>
  );
}

function Breadcrumbs({ pathname }: { pathname: string }) {
  const parts = pathname.split("?")[0]?.split("/").filter(Boolean) ?? [];
  if (parts.length === 0) return null;

  const crumbs = parts.map((p, idx) => ({
    href: "/" + parts.slice(0, idx + 1).join("/"),
    label: p.replace(/-/g, " ")
  }));

  return (
    <nav aria-label="Breadcrumbs" className="hidden text-xs text-muted/75 md:block">
      <ol className="flex items-center gap-2">
        <li>
          <Link className="hover:text-text/90" href="/">
            JobTracker
          </Link>
        </li>
        {crumbs.map((c) => (
          <li key={c.href} className="flex items-center gap-2">
            <span className="text-muted/50">/</span>
            <Link className="hover:text-text/90" href={c.href}>
              {c.label}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function AppHeader({
  sidebarCollapsed,
  onToggleSidebar,
  onOpenMobileMenu
}: {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileMenu: () => void;
}) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();

  const pageTitle = getNavLabel(pathname);
  const [q, setQ] = React.useState("");

  // Avoid `useSearchParams` here to keep static pages build-friendly.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    setQ(sp.get("q") ?? "");
  }, [pathname]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/jobs?q=${encodeURIComponent(query)}` : "/jobs");
  }

  const mobilePrimary = NAV_ITEMS.filter((i) => i.mobile);

  return (
    <header className="surface rounded-2xl px-3 py-3 md:px-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="md:hidden">
            <IconButton aria-label="Open menu" onClick={onOpenMobileMenu}>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </IconButton>
          </div>

          <div className="hidden md:block">
            <IconButton
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={onToggleSidebar}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path
                  d="M4 6h16M4 12h10M4 18h16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </IconButton>
          </div>

          <div className="hidden md:block">
            <div className="text-sm font-semibold tracking-tight">{pageTitle}</div>
            <Breadcrumbs pathname={pathname} />
          </div>
          <div className="md:hidden">
            <Logo compact />
          </div>
        </div>

        <form onSubmit={onSubmit} className="hidden flex-1 md:block">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted/70">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  d="M21 21l-4.3-4.3M10.8 18.2a7.4 7.4 0 1 1 0-14.8 7.4 7.4 0 0 1 0 14.8z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search jobs or company…"
              className="pl-10"
              aria-label="Search"
            />
          </div>
        </form>

        <div className="flex items-center gap-2">
          <Button asChild variant="secondary" className="hidden md:inline-flex">
            <Link href="/jobs">Quick add</Link>
          </Button>

          <IconButton aria-label="Notifications">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M13.7 21a2 2 0 0 1-3.4 0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </IconButton>

          <div className="relative hidden md:block">
            <Link
              href="/profile"
              className={cn(
                "flex h-10 items-center gap-2 rounded-xl bg-surface/55 px-3 text-sm ring-1 ring-border/60 shadow-elev-1 hover:bg-surface/80 hover:ring-border/85"
              )}
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/25">
                JT
              </span>
              <span className="text-text/85">Account</span>
            </Link>
          </div>

          {/* Mobile quick nav: show 1-tap primary links */}
          <nav aria-label="Primary" className="md:hidden">
            <ul className="flex items-center gap-1">
              {mobilePrimary.slice(0, 2).map((i) => (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-surface/55 ring-1 ring-border/60 shadow-elev-1 hover:bg-surface/80"
                    aria-label={i.label}
                  >
                    {i.icon()}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}

