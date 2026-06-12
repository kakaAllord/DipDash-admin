import { cn } from "@/lib/cn";

export function Logo({ size = 40 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/icon.svg" alt="Dipdash" width={size} height={size} className="rounded-xl" />
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("text-xl font-extrabold tracking-tight text-primary-dark", className)}>
      dip<span className="text-primary">dash</span>
    </span>
  );
}
