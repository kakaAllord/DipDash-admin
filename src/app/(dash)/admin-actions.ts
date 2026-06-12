"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db/client";
import { getSession } from "@/lib/auth/session";
import { courierToken } from "@/lib/ids";
import { resolveCourierFault } from "@/lib/domain/escrow";
import { RISK } from "@/lib/domain/risk";

export interface Result {
  ok: boolean;
  error?: string;
  token?: string;
}

async function requireAdmin() {
  return getSession("admin");
}

/** Approve a pending courier and issue an activation token (simulated SMS). */
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

  const token = courierToken();
  await db
    .update(schema.couriers)
    .set({ status: "approved", activationToken: token })
    .where(eq(schema.couriers.id, courierId));

  console.log(`[SIM SMS] Courier ${courierId} approved. Token: ${token}`);
  revalidatePath("/couriers");
  return { ok: true, token };
}

export async function rejectCourier(courierId: string): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized" };
  await db.delete(schema.couriers).where(eq(schema.couriers.id, courierId));
  revalidatePath("/couriers");
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
