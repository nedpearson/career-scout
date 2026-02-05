"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export function LogoMark({
  className,
  size = 28,
  title = "JobTracker"
}: {
  className?: string;
  size?: number;
  title?: string;
}) {
  return (
    <svg
      aria-label={title}
      role="img"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={cn("shrink-0", className)}
    >
      <title>{title}</title>

      {/* Orbit swoosh */}
      <g className="text-primary">
        <path
          d="M6.6 12.1c2.5-4.8 7.3-8 13.0-8 2.2 0 4.3.5 6.2 1.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.9"
        />
        <path
          d="M25.7 5.6l.8 3.6-3.5-.9"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
      </g>

      {/* Briefcase */}
      <g className="text-text">
        <path
          d="M11 9.5c0-1 .8-1.8 1.8-1.8h6.4c1 0 1.8.8 1.8 1.8v1.2h-2.1V10c0-.4-.3-.7-.7-.7h-5.4c-.4 0-.7.3-.7.7v.7H11V9.5z"
          fill="currentColor"
          opacity="0.9"
        />
      </g>
      <g className="text-surface">
        <path
          d="M8.6 11.2c0-1 .8-1.8 1.8-1.8h11.2c1 0 1.8.8 1.8 1.8v10.2c0 1-.8 1.8-1.8 1.8H10.4c-1 0-1.8-.8-1.8-1.8V11.2z"
          fill="currentColor"
        />
      </g>
      <g className="text-border">
        <path
          d="M10.4 9.4h11.2c1 0 1.8.8 1.8 1.8v10.2c0 1-.8 1.8-1.8 1.8H10.4c-1 0-1.8-.8-1.8-1.8V11.2c0-1 .8-1.8 1.8-1.8z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.9"
        />
      </g>

      {/* Check */}
      <g className="text-success">
        <path
          d="M12.3 16.8l2.1 2.2 5-5.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Sparkle */}
      <g className="text-accent">
        <path
          d="M25.8 12.8l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6.6-1.6z"
          fill="currentColor"
          opacity="0.95"
        />
      </g>
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
  size = 28,
  compact = false
}: {
  className?: string;
  markClassName?: string;
  size?: number;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LogoMark size={size} className={markClassName} />
      {compact ? null : (
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-tight">
            <span className="bg-gradient-to-r from-primary to-success bg-clip-text text-transparent">
              JobTracker
            </span>
          </div>
          <div className="text-xs text-muted/80">Your personal headhunter</div>
        </div>
      )}
    </div>
  );
}

