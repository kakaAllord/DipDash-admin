import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import type { Courier, MenuItem, Vendor } from "@/lib/db/schema";
import { cycleMetrics } from "@/lib/domain/lifecycle";

export async function getAdminByUsername(username: string) {
  const rows = await db
    .select()
    .from(schema.adminUsers)
    .where(eq(schema.adminUsers.username, username.trim()))
    .limit(1);
  return rows[0] ?? null;
}

export interface CourierRow extends Courier {
  studentName: string;
  admissionNo: string;
  phone: string;
}

export async function listCouriers(): Promise<CourierRow[]> {
  const rows = await db
    .select({ courier: schema.couriers, student: schema.students })
    .from(schema.couriers)
    .innerJoin(schema.students, eq(schema.couriers.studentId, schema.students.id))
    .orderBy(desc(schema.couriers.createdAt));
  return rows.map((r) => ({
    ...r.courier,
    studentName: r.student.name,
    admissionNo: r.student.admissionNo,
    phone: r.student.phone,
  }));
}

export interface VendorWithMenu extends Vendor {
  items: MenuItem[];
}

export async function listVendorsWithMenu(): Promise<VendorWithMenu[]> {
  const [vendors, items] = await Promise.all([
    db.select().from(schema.vendors).orderBy(asc(schema.vendors.name)),
    db.select().from(schema.menuItems).orderBy(asc(schema.menuItems.priceTsh)),
  ]);
  return vendors.map((v) => ({
    ...v,
    items: items.filter((i) => i.vendorId === v.id),
  }));
}

export interface EscrowRow {
  txnId: string;
  state: string;
  amountTsh: number;
  note: string | null;
  orderId: string;
  orderStatus: string;
  vendorName: string;
  studentName: string;
  courierName: string | null;
  itemCostTsh: number;
  deliveryFeeTsh: number;
}

export async function listEscrow(): Promise<EscrowRow[]> {
  const [txns, orders, vendors, students, couriers] = await Promise.all([
    db.select().from(schema.escrowTxns).orderBy(desc(schema.escrowTxns.createdAt)),
    db.select().from(schema.orders),
    db.select().from(schema.vendors),
    db.select().from(schema.students),
    db.select().from(schema.couriers),
  ]);
  const oById = new Map(orders.map((o) => [o.id, o]));
  const vById = new Map(vendors.map((v) => [v.id, v]));
  const sById = new Map(students.map((s) => [s.id, s]));
  const cById = new Map(couriers.map((c) => [c.id, c]));

  return txns.map((t) => {
    const order = oById.get(t.orderId);
    const courier = order?.courierId ? cById.get(order.courierId) : null;
    const courierStudent = courier ? sById.get(courier.studentId) : null;
    return {
      txnId: t.id,
      state: t.state,
      amountTsh: t.amountTsh,
      note: t.note,
      orderId: t.orderId,
      orderStatus: order?.status ?? "unknown",
      vendorName: order ? vById.get(order.vendorId)?.name ?? "Unknown" : "Unknown",
      studentName: order ? sById.get(order.studentId)?.name ?? "Student" : "Student",
      courierName: courierStudent?.name ?? null,
      itemCostTsh: order?.itemCostTsh ?? 0,
      deliveryFeeTsh: order?.deliveryFeeTsh ?? 0,
    };
  });
}

export async function analytics() {
  const orders = await db.select().from(schema.orders);
  const delivered = orders.filter((o) => o.status === "delivered");

  const avg = (nums: number[]) =>
    nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null;

  const metrics = delivered.map((o) =>
    cycleMetrics({
      t0PlacedAt: o.t0PlacedAt,
      t1AcceptedAt: o.t1AcceptedAt,
      t2CollectedAt: o.t2CollectedAt,
      t3DeliveredAt: o.t3DeliveredAt,
    })
  );

  const gmv = orders
    .filter((o) => o.status !== "pending_payment" && o.status !== "refunded")
    .reduce((sum, o) => sum + o.totalTsh, 0);

  // Demand curve: orders per hour-of-day from T0.
  const demandByHour = new Array(24).fill(0) as number[];
  for (const o of orders) {
    if (o.t0PlacedAt) demandByHour[new Date(o.t0PlacedAt).getHours()]++;
  }

  return {
    totalOrders: orders.length,
    activeOrders: orders.filter((o) =>
      ["paid", "accepted", "collected"].includes(o.status)
    ).length,
    deliveredOrders: delivered.length,
    disputedOrders: orders.filter((o) => o.status === "disputed").length,
    gmvTsh: gmv,
    avgMatchMs: avg(metrics.map((m) => m.matchMs).filter((n): n is number => n != null)),
    avgPrepMs: avg(metrics.map((m) => m.prepMs).filter((n): n is number => n != null)),
    avgTransitMs: avg(
      metrics.map((m) => m.transitMs).filter((n): n is number => n != null)
    ),
    avgTotalMs: avg(metrics.map((m) => m.totalMs).filter((n): n is number => n != null)),
    demandByHour,
  };
}
