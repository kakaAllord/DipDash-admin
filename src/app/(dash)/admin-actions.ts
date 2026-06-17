"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db/client";
import { getSession } from "@/lib/auth/session";
import { id } from "@/lib/ids";
import { resolveCourierFault } from "@/lib/domain/escrow";
import { RISK, canAcceptOrder } from "@/lib/domain/risk";
import { isHotMeal, MENU_CATEGORIES, type MenuCategory } from "@/lib/domain/catalog";
import { courierDetail, type CourierDetail } from "@/lib/repo/admin";

export interface Result {
  ok: boolean;
  error?: string;
}

async function requireAdmin() {
  return getSession("admin");
}

/**
 * Set (or replace) the active delivery surge. Deactivates any prior active surge
 * so at most one is ever in effect, then inserts the new one. `endsAt` is an
 * optional epoch-ms auto-expiry; omit for "until terminated". The caller emits a
 * `surge` socket event after this so student price views re-quote live.
 */
export async function setSurge(input: {
  reason: string;
  inCampusTsh: number;
  outCampusTsh: number;
  endsAt?: number | null;
}): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized" };
  const reason = input.reason?.trim();
  if (!reason) return { ok: false, error: "Give the surge a reason" };
  const inCampusTsh = Math.max(0, Math.round(input.inCampusTsh || 0));
  const outCampusTsh = Math.max(0, Math.round(input.outCampusTsh || 0));
  if (inCampusTsh === 0 && outCampusTsh === 0) {
    return { ok: false, error: "Set at least one surge amount above 0" };
  }
  if (input.endsAt != null && input.endsAt <= Date.now()) {
    return { ok: false, error: "End time must be in the future" };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(schema.surges)
      .set({ active: false })
      .where(eq(schema.surges.active, true));
    await tx.insert(schema.surges).values({
      id: id("srg"),
      reason,
      inCampusTsh,
      outCampusTsh,
      startsAt: Date.now(),
      endsAt: input.endsAt ?? null,
      active: true,
    });
  });

  revalidatePath("/surge");
  return { ok: true };
}

/** Turn off any active surge immediately. */
export async function terminateSurge(): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized" };
  await db
    .update(schema.surges)
    .set({ active: false })
    .where(eq(schema.surges.active, true));
  revalidatePath("/surge");
  return { ok: true };
}

/** Approve a pending courier. They then sign in with their admission + password. */
export async function approveCourier(courierId: string): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized" };

  const rows = await db
    .select()
    .from(schema.couriers)
    .where(eq(schema.couriers.id, courierId))
    .limit(1);
  const courier = rows[0];
  if (!courier) return { ok: false, error: "Courier not found" };
  if (courier.status !== "pending") {
    return { ok: false, error: "Courier is not pending" };
  }

  await db
    .update(schema.couriers)
    .set({ status: "approved" })
    .where(eq(schema.couriers.id, courierId));

  revalidatePath("/couriers");
  return { ok: true };
}

export async function rejectCourier(courierId: string): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized" };
  await db.delete(schema.couriers).where(eq(schema.couriers.id, courierId));
  revalidatePath("/couriers");
  return { ok: true };
}

/** Manually assign a scheduled order to a courier (admin dispatch). */
export async function assignCourier(
  orderId: string,
  courierId: string
): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized" };

  const [orderRows, courierRows, items] = await Promise.all([
    db.select().from(schema.orders).where(eq(schema.orders.id, orderId)).limit(1),
    db.select().from(schema.couriers).where(eq(schema.couriers.id, courierId)).limit(1),
    db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, orderId)),
  ]);
  const order = orderRows[0];
  const courier = courierRows[0];
  if (!order) return { ok: false, error: "Order not found" };
  if (order.courierId || order.status !== "scheduled") {
    return { ok: false, error: "Order is no longer awaiting dispatch" };
  }
  if (!courier || courier.status !== "active") {
    return { ok: false, error: "Courier is not active" };
  }

  const hasHotMeal = items.some((i) => isHotMeal(i.category as MenuCategory));
  const check = canAcceptOrder({
    depositTsh: courier.depositTsh,
    itemCostTsh: order.itemCostTsh,
    hasHotMeal,
  });
  if (!check.ok) return { ok: false, error: check.reason };

  const claimed = await db
    .update(schema.orders)
    .set({ courierId, status: "accepted", t1AcceptedAt: Date.now() })
    .where(and(eq(schema.orders.id, orderId), isNull(schema.orders.courierId)))
    .returning({ id: schema.orders.id });
  if (claimed.length === 0) {
    return { ok: false, error: "Order was just taken" };
  }

  revalidatePath("/dispatch");
  revalidatePath("/orders");
  return { ok: true };
}

/** Lazy-load a courier's orders + reviews for the detail modal. */
export async function loadCourierDetail(
  courierId: string
): Promise<CourierDetail | null> {
  if (!(await requireAdmin())) return null;
  return courierDetail(courierId);
}

export interface VendorInput {
  name: string;
  location: "in_campus" | "out_campus";
  blurb?: string;
  lat?: number | null;
  lng?: number | null;
}

/** Add a vendor, including pickup coordinates used for distance + maps. */
export async function createVendor(input: VendorInput): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized" };
  const name = input.name?.trim();
  if (!name) return { ok: false, error: "Vendor name is required" };
  if (input.location !== "in_campus" && input.location !== "out_campus") {
    return { ok: false, error: "Choose a location" };
  }
  await db.insert(schema.vendors).values({
    id: id("ven"),
    name,
    location: input.location,
    blurb: input.blurb?.trim() || null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    isOpen: true,
  });
  revalidatePath("/vendors");
  return { ok: true };
}

export interface MenuItemInput {
  vendorId: string;
  name: string;
  category: string;
  priceTsh: number;
}

/** Add a menu item to a vendor. */
export async function createMenuItem(input: MenuItemInput): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized" };
  const name = input.name?.trim();
  if (!name) return { ok: false, error: "Item name is required" };
  if (!MENU_CATEGORIES.includes(input.category as MenuCategory)) {
    return { ok: false, error: "Choose a valid category" };
  }
  const price = Math.round(input.priceTsh);
  if (!Number.isFinite(price) || price <= 0) {
    return { ok: false, error: "Enter a price above 0" };
  }
  await db.insert(schema.menuItems).values({
    id: id("itm"),
    vendorId: input.vendorId,
    name,
    category: input.category,
    priceTsh: price,
    inStock: true,
  });
  revalidatePath("/vendors");
  return { ok: true };
}

/** Instant catalog override — toggle an item in/out of stock platform-wide. */
export async function toggleStock(
  menuItemId: string,
  inStock: boolean
): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized" };
  await db
    .update(schema.menuItems)
    .set({ inStock })
    .where(eq(schema.menuItems.id, menuItemId));
  revalidatePath("/vendors");
  return { ok: true };
}

/** Flag an in-flight order as disputed and freeze the courier's deposit. */
export async function freezeOrder(orderId: string): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized" };
  const rows = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId))
    .limit(1);
  const order = rows[0];
  if (!order) return { ok: false, error: "Order not found" };
  if (!["paid", "accepted", "collected"].includes(order.status)) {
    return { ok: false, error: "Order can't be disputed in its current state" };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(schema.orders)
      .set({ status: "disputed" })
      .where(eq(schema.orders.id, orderId));
    await tx
      .update(schema.escrowTxns)
      .set({ state: "frozen", note: "Frozen pending admin review" })
      .where(eq(schema.escrowTxns.orderId, orderId));
  });

  revalidatePath("/escrow");
  revalidatePath("/orders");
  return { ok: true };
}

/** Rule the courier at fault: deduct meal cost, refund student, restrict if low. */
export async function approveDeduction(orderId: string): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized" };
  const rows = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId))
    .limit(1);
  const order = rows[0];
  if (!order || order.status !== "disputed") {
    return { ok: false, error: "Order is not under dispute" };
  }
  if (!order.courierId) return { ok: false, error: "No courier on this order" };

  const courierRows = await db
    .select()
    .from(schema.couriers)
    .where(eq(schema.couriers.id, order.courierId))
    .limit(1);
  const courier = courierRows[0];
  if (!courier) return { ok: false, error: "Courier not found" };

  const resolution = resolveCourierFault({
    itemCostTsh: order.itemCostTsh,
    deliveryFeeTsh: order.deliveryFeeTsh,
    courierDepositTsh: courier.depositTsh,
    minDepositTsh: RISK.minDepositTsh,
  });

  await db.transaction(async (tx) => {
    await tx
      .update(schema.couriers)
      .set({
        depositTsh: resolution.newDepositTsh,
        status: resolution.restrict ? "restricted" : courier.status,
        isOnline: resolution.restrict ? false : courier.isOnline,
      })
      .where(eq(schema.couriers.id, courier.id));
    await tx
      .update(schema.orders)
      .set({ status: "refunded" })
      .where(eq(schema.orders.id, orderId));
    await tx
      .update(schema.escrowTxns)
      .set({
        state: "refunded",
        note: `Courier at fault: ${resolution.deductionTsh} deducted, ${resolution.refundTsh} refunded`,
      })
      .where(eq(schema.escrowTxns.orderId, orderId));
  });

  revalidatePath("/escrow");
  revalidatePath("/couriers");
  return { ok: true };
}

/** Rule no fault: release the freeze and let the order proceed (back to accepted). */
export async function dismissDispute(orderId: string): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized" };
  await db.transaction(async (tx) => {
    await tx
      .update(schema.orders)
      .set({ status: "collected" })
      .where(eq(schema.orders.id, orderId));
    await tx
      .update(schema.escrowTxns)
      .set({ state: "held", note: "Dispute dismissed — funds re-held" })
      .where(eq(schema.escrowTxns.orderId, orderId));
  });
  revalidatePath("/escrow");
  return { ok: true };
}
