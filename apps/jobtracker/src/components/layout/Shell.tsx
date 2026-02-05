"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { NAV_ITEMS } from "@/components/layout/nav";
import { Logo } from "@/components/brand/Logo";

function isAuthRoute(pathname: string) {
  return pathname === "/signin" || pathname === "/signup";
}

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

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const auth = isAuthRoute(pathname);
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorageBoolean("jt.sidebarCollapsed", false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  if (auth) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-10">
          <main className="mx-auto w-full max-w-md">
            <div className="mb-6 text-center">
              <Link href="/" className="inline-block">
                <div className="inline-flex items-center justify-center">
                  <Logo />
                </div>
              </Link>
              <div className="mt-3 text-sm text-muted/80">
                Track jobs, score fit, and follow up with confidence.
              </div>
            </div>
            {children}
            <div className="mt-6 text-center text-xs text-muted/70">
              Built for job seekers • Keep your data private • Shareable deployment
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-7xl gap-4 px-3 py-4 md:px-4">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-4 pb-20 md:pb-6">
          <AppHeader
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
          />

          <main className="min-w-0 flex-1">{children}</main>

          <div className="hidden text-center text-xs text-muted/65 md:block">
            Built for job seekers • Keep your data private • Shareable deployment
          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />

      {/* Mobile Quick Add FAB */}
      <Link
        href="/jobs"
        aria-label="Quick add"
        className="fixed bottom-[84px] right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-fg shadow-elev-2 ring-1 ring-primary/30 hover:brightness-110 active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 md:hidden"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path
            d="M12 5v14M5 12h14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </Link>

      {/* Mobile menu overlay */}
      {mobileMenuOpen ? (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute inset-x-3 top-3 rounded-2xl bg-bg/90 p-3 ring-1 ring-border/60 shadow-elev-2 backdrop-blur">
            <div className="flex items-center justify-between">
              <Logo compact />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-surface/55 ring-1 ring-border/60 hover:bg-surface/80"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path
                    d="M6 6l12 12M18 6 6 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <div className="mt-3 grid gap-2">
              {NAV_ITEMS.map((i) => (
                <Link
                  key={i.href}
                  href={i.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-2xl bg-surface/55 px-3 py-3 text-sm text-text/85 ring-1 ring-border/60 hover:bg-surface/80"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-primary">{i.icon()}</span>
                    <span className="font-medium">{i.label}</span>
                  </span>
                  <span className="text-muted/70">→</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

