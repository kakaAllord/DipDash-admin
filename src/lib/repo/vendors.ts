import "server-only";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

export async function listVendors() {
  return db.select().from(schema.vendors).orderBy(asc(schema.vendors.name));
}

export async function getVendor(vendorId: string) {
  const rows = await db
    .select()
    .from(schema.vendors)
    .where(eq(schema.vendors.id, vendorId))
    .limit(1);
  return rows[0] ?? null;
}

export async function listMenu(vendorId: string) {
  return db
    .select()
    .from(schema.menuItems)
    .where(eq(schema.menuItems.vendorId, vendorId))
    .orderBy(asc(schema.menuItems.priceTsh));
}

export async function getMenuItems(ids: string[]) {
  if (ids.length === 0) return [];
  const all = await db.select().from(schema.menuItems);
  const set = new Set(ids);
  return all.filter((m) => set.has(m.id));
}
