import "server-only";
import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import type { Surge } from "@/lib/db/schema";

/**
 * The single delivery surge currently in effect, or null. A surge counts only
 * while `active` and not past its `endsAt` — an expired row is ignored here, so
 * surges auto-lapse server-side without a scheduler.
 */
export async function getActiveSurge(): Promise<Surge | null> {
  const now = Date.now();
  const rows = await db
    .select()
    .from(schema.surges)
    .where(
      and(
        eq(schema.surges.active, true),
        or(isNull(schema.surges.endsAt), gt(schema.surges.endsAt, now))
      )
    )
    .orderBy(desc(schema.surges.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

/** Resolve the surge add-on (TSh) for a vendor location, 0 if none active. */
export function surgeForLocation(
  surge: Surge | null,
  location: string
): number {
  if (!surge) return 0;
  return location === "in_campus" ? surge.inCampusTsh : surge.outCampusTsh;
}
