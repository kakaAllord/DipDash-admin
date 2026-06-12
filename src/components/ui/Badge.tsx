import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

type Tone = "neutral" | "primary" | "accent" | "danger" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-border/60 text-muted",
  primary: "bg-primary-soft text-primary-dark",
  accent: "bg-accent-soft text-accent",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
