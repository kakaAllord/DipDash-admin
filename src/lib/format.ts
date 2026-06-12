/** Formatting helpers shared across all surfaces. */

/** 1600 -> "1,600 TSh" */
export function tsh(amount: number): string {
  return `${Math.round(amount).toLocaleString("en-US")} TSh`;
}

/** Short clock, e.g. "19:04" */
export function clock(d: Date | number | string): string {
  const date = new Date(d);
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Duration between two epoch-ms timestamps, e.g. "4m 12s" or "—" */
export function duration(from?: number | null, to?: number | null): string {
  if (!from || !to) return "—";
  const secs = Math.max(0, Math.round((to - from) / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
