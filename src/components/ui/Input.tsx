import { cn } from "@/lib/cn";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Input({
  label,
  hint,
  error,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? props.name;
  return (
    <label className="block" htmlFor={inputId}>
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-text">
          {label}
        </span>
      )}
      <input
        id={inputId}
        className={cn(
          "h-12 w-full rounded-xl border bg-surface px-3.5 text-base text-text outline-none transition-colors placeholder:text-muted/60 focus:border-primary focus:ring-2 focus:ring-primary-soft",
          error ? "border-danger" : "border-border",
          className
        )}
        {...props}
      />
      {error ? (
        <span className="mt-1 block text-sm text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-sm text-muted">{hint}</span>
      ) : null}
    </label>
  );
}
