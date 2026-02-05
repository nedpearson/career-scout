import * as React from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center rounded-xl text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-fg shadow-elev-1 hover:brightness-110 active:brightness-95",
  secondary:
    "bg-surface/70 text-text ring-1 ring-border/70 shadow-elev-1 hover:bg-surface/85 hover:ring-border/90",
  ghost: "bg-transparent text-text/85 hover:bg-surface/60 ring-1 ring-border/60 hover:ring-border/85",
  destructive: "bg-red-500/90 text-white hover:bg-red-500 active:bg-red-600"
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3",
  md: "h-10 px-4",
  lg: "h-11 px-5"
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  asChild,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}) {
  const classes = cn(base, variants[variant], sizes[size], className);
  if (asChild) {
    const child = React.Children.only(props.children);
    if (!React.isValidElement(child)) return null;
    return React.cloneElement(child, {
      className: cn(classes, (child.props as { className?: string }).className)
    });
  }
  return <button className={classes} {...props} />;
}

