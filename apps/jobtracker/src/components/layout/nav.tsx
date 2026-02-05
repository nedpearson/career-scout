import * as React from "react";

type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: (props?: { className?: string }) => React.ReactNode;
  mobile?: boolean;
};

function IconBase({
  children,
  className
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    shortLabel: "Home",
    mobile: true,
    icon: ({ className } = {}) => (
      <IconBase className={className}>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
        <path d="M9.5 21V14h5v7" />
      </IconBase>
    )
  },
  {
    href: "/jobs",
    label: "Jobs",
    shortLabel: "Jobs",
    mobile: true,
    icon: ({ className } = {}) => (
      <IconBase className={className}>
        <path d="M9 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1" />
        <rect x="3" y="6" width="18" height="15" rx="2" />
        <path d="M3 12h18" />
      </IconBase>
    )
  },
  {
    href: "/applications",
    label: "Applications",
    shortLabel: "Apps",
    mobile: true,
    icon: ({ className } = {}) => (
      <IconBase className={className}>
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <path d="M3 6h.01" />
        <path d="M3 12h.01" />
        <path d="M3 18h.01" />
      </IconBase>
    )
  },
  {
    href: "/network",
    label: "Network",
    shortLabel: "Network",
    mobile: true,
    icon: ({ className } = {}) => (
      <IconBase className={className}>
        <path d="M16 11a4 4 0 1 0-8 0" />
        <path d="M4 21a8 8 0 0 1 16 0" />
        <path d="M20 8v6" />
        <path d="M23 11h-6" />
      </IconBase>
    )
  },
  {
    href: "/outreach",
    label: "Outreach",
    shortLabel: "Outreach",
    mobile: true,
    icon: ({ className } = {}) => (
      <IconBase className={className}>
        <path d="M4 4h16v16H4z" />
        <path d="m4 7 8 6 8-6" />
      </IconBase>
    )
  },
  {
    href: "/profile",
    label: "Profile",
    shortLabel: "Profile",
    icon: ({ className } = {}) => (
      <IconBase className={className}>
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="8" r="4" />
      </IconBase>
    )
  },
  {
    href: "/settings",
    label: "Settings",
    shortLabel: "Settings",
    icon: ({ className } = {}) => (
      <IconBase className={className}>
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
        <path d="M19.4 15a7.9 7.9 0 0 0 .1-1l2-1-2-3-2 1a8.8 8.8 0 0 0-1.7-1L16 7h-8l-.8 3a8.8 8.8 0 0 0-1.7 1l-2-1-2 3 2 1a7.9 7.9 0 0 0 .1 1 7.9 7.9 0 0 0-.1 1l-2 1 2 3 2-1a8.8 8.8 0 0 0 1.7 1L8 23h8l.8-3a8.8 8.8 0 0 0 1.7-1l2 1 2-3-2-1a7.9 7.9 0 0 0-.1-1z" />
      </IconBase>
    )
  }
];

export function getNavLabel(pathname: string) {
  const exact = NAV_ITEMS.find((i) => i.href === pathname);
  if (exact) return exact.label;

  // Prefer longest prefix match for deep pages.
  const prefixes = NAV_ITEMS.filter((i) => i.href !== "/" && pathname.startsWith(i.href + "/")).sort(
    (a, b) => b.href.length - a.href.length
  );
  return prefixes[0]?.label ?? "Dashboard";
}

