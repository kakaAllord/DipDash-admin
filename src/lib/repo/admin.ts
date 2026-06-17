import "server-only";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import type { Courier, MenuItem, Vendor } from "@/lib/db/schema";
import { cycleMetrics } from "@/lib/domain/lifecycle";
import { isHotMeal, type MenuCategory } from "@/lib/domain/catalog";
import { orderCeiling } from "@/lib/domain/risk";

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

export interface LiveCourier {
  id: string;
  name: string;
  status: string;
  isOnline: boolean;
  lat: number | null;
  lng: number | null;
  lastLocationAt: number | null;
}

export interface LiveOrder {
  id: string;
  status: string;
  vendorName: string;
  studentName: string;
  courierId: string | null;
  courierName: string | null;
  deliverTo: string | null;
  deliverLat: number | null;
  deliverLng: number | null;
  vendorLat: number | null;
  vendorLng: number | null;
  deliverAt: number | null;
  deliverWindowMin: number;
}

export interface LiveVendor {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
}

/** Online couriers + in-flight orders + vendors, for the admin live map. */
export async function listLiveMapData(): Promise<{
  couriers: LiveCourier[];
  orders: LiveOrder[];
  vendors: LiveVendor[];
}> {
  const [couriers, students, orders, vendors] = await Promise.all([
    db.select().from(schema.couriers),
    db.select().from(schema.students),
    db.select().from(schema.orders),
    db.select().from(schema.vendors),
  ]);
  const sById = new Map(students.map((s) => [s.id, s]));
  const cById = new Map(couriers.map((c) => [c.id, c]));
  const vById = new Map(vendors.map((v) => [v.id, v]));

  const liveCouriers: LiveCourier[] = couriers
    .filter((c) => c.isOnline)
    .map((c) => ({
      id: c.id,
      name: sById.get(c.studentId)?.name ?? "Courier",
      status: c.status,
      isOnline: c.isOnline,
      lat: c.lastLat,
      lng: c.lastLng,
      lastLocationAt: c.lastLocationAt,
    }));

  const activeOrders: LiveOrder[] = orders
    .filter((o) => ["paid", "accepted", "collected"].includes(o.status))
    .map((o) => {
      const vendor = vById.get(o.vendorId);
      const courier = o.courierId ? cById.get(o.courierId) : null;
      const courierStudent = courier ? sById.get(courier.studentId) : null;
      return {
        id: o.id,
        status: o.status,
        vendorName: vendor?.name ?? "Unknown",
        studentName: sById.get(o.studentId)?.name ?? "Student",
        courierId: o.courierId,
        courierName: courierStudent?.name ?? null,
        deliverTo: o.deliverTo,
        deliverLat: o.deliverLat,
        deliverLng: o.deliverLng,
        vendorLat: vendor?.lat ?? null,
        vendorLng: vendor?.lng ?? null,
        deliverAt: o.deliverAt,
        deliverWindowMin: o.deliverWindowMin,
      };
    });

  const liveVendors: LiveVendor[] = vendors
    .filter((v) => v.lat != null && v.lng != null)
    .map((v) => ({
      id: v.id,
      name: v.name,
      location: v.location,
      lat: v.lat as number,
      lng: v.lng as number,
    }));

  return { couriers: liveCouriers, orders: activeOrders, vendors: liveVendors };
}

/** Average stars + count per courier, for the courier pool view. */
export async function courierRatingStats(): Promise<
  Map<string, { avg: number; count: number }>
> {
  const rows = await db.select().from(schema.ratings);
  const byCourier = new Map<string, number[]>();
  for (const r of rows) {
    const arr = byCourier.get(r.courierId) ?? [];
    arr.push(r.stars);
    byCourier.set(r.courierId, arr);
  }
  const out = new Map<string, { avg: number; count: number }>();
  for (const [courierId, stars] of byCourier) {
    out.set(courierId, {
      avg: stars.reduce((a, b) => a + b, 0) / stars.length,
      count: stars.length,
    });
  }
  return out;
}

export interface CourierOrderLine {
  id: string;
  status: string;
  vendorName: string;
  deliverTo: string | null;
  itemCostTsh: number;
  deliveryFeeTsh: number;
  totalTsh: number;
  t0PlacedAt: number | null;
  t3DeliveredAt: number | null;
}

export interface CourierReview {
  stars: number;
  comment: string | null;
  studentName: string;
  createdAt: number;
}

export interface CourierDetail {
  active: CourierOrderLine[]; // working on now (accepted / collected)
  past: CourierOrderLine[]; // delivered / refunded / disputed
  reviews: CourierReview[];
}

/** A courier's in-flight orders, completed history, and student reviews. */
export async function courierDetail(courierId: string): Promise<CourierDetail> {
  const [orders, vendors, ratings, students] = await Promise.all([
    db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.courierId, courierId))
      .orderBy(desc(schema.orders.createdAt)),
    db.select().from(schema.vendors),
    db
      .select()
      .from(schema.ratings)
      .where(eq(schema.ratings.courierId, courierId))
      .orderBy(desc(schema.ratings.createdAt)),
    db.select().from(schema.students),
  ]);
  const vById = new Map(vendors.map((v) => [v.id, v]));
  const sById = new Map(students.map((s) => [s.id, s]));

  const toLine = (o: (typeof orders)[number]): CourierOrderLine => ({
    id: o.id,
    status: o.status,
    vendorName: vById.get(o.vendorId)?.name ?? "Unknown",
    deliverTo: o.deliverTo,
    itemCostTsh: o.itemCostTsh,
    deliveryFeeTsh: o.deliveryFeeTsh,
    totalTsh: o.totalTsh,
    t0PlacedAt: o.t0PlacedAt,
    t3DeliveredAt: o.t3DeliveredAt,
  });

  const active = orders
    .filter((o) => o.status === "accepted" || o.status === "collected")
    .map(toLine);
  const past = orders
    .filter((o) => ["delivered", "refunded", "disputed"].includes(o.status))
    .map(toLine);
  const reviews: CourierReview[] = ratings.map((r) => ({
    stars: r.stars,
    comment: r.comment,
    studentName: sById.get(r.studentId)?.name ?? "Student",
    createdAt: r.createdAt,
  }));

  return { active, past, reviews };
}

/** Known academic levels (NTA). Listed so zero-buying levels still show. */
export const LEVELS = ["4", "5", "6", "7-1", "7-2", "7-3", "8"] as const;

export interface LevelStat {
  level: string;
  orders: number;
  spendTsh: number;
  customers: number; // distinct buyers at this level
}

export interface TopCustomer {
  name: string;
  level: string | null;
  course: string | null;
  orders: number;
  spendTsh: number;
}

export interface CustomerAnalytics {
  byLevel: LevelStat[]; // sorted most → least orders
  topCustomers: TopCustomer[];
  demandByHour: number[];
  peakHour: number | null;
}

/**
 * Buying behaviour by student level + the most active customers. A "buying"
 * order is any that wasn't abandoned (excludes pending_payment / refunded).
 */
export async function customerAnalytics(): Promise<CustomerAnalytics> {
  const [orders, students] = await Promise.all([
    db.select().from(schema.orders),
    db.select().from(schema.students),
  ]);
  const sById = new Map(students.map((s) => [s.id, s]));
  const counted = orders.filter(
    (o) => o.status !== "pending_payment" && o.status !== "refunded"
  );

  // Per level.
  const levelMap = new Map<string, { orders: number; spend: number; buyers: Set<string> }>();
  for (const lvl of LEVELS) levelMap.set(lvl, { orders: 0, spend: 0, buyers: new Set() });
  // Per student.
  const custMap = new Map<string, { orders: number; spend: number }>();

  const demandByHour = new Array(24).fill(0) as number[];

  for (const o of counted) {
    const student = sById.get(o.studentId);
    const lvl = student?.level ?? "—";
    const bucket = levelMap.get(lvl) ?? { orders: 0, spend: 0, buyers: new Set<string>() };
    bucket.orders += 1;
    bucket.spend += o.totalTsh;
    bucket.buyers.add(o.studentId);
    levelMap.set(lvl, bucket);

    const c = custMap.get(o.studentId) ?? { orders: 0, spend: 0 };
    c.orders += 1;
    c.spend += o.totalTsh;
    custMap.set(o.studentId, c);

    if (o.t0PlacedAt) demandByHour[new Date(o.t0PlacedAt).getHours()]++;
  }

  const byLevel: LevelStat[] = [...levelMap.entries()]
    .map(([level, v]) => ({
      level,
      orders: v.orders,
      spendTsh: v.spend,
      customers: v.buyers.size,
    }))
    .sort((a, b) => b.orders - a.orders);

  const topCustomers: TopCustomer[] = [...custMap.entries()]
    .map(([sid, v]) => {
      const s = sById.get(sid);
      return {
        name: s?.name ?? "Student",
        level: s?.level ?? null,
        course: s?.course ?? null,
        orders: v.orders,
        spendTsh: v.spend,
      };
    })
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 15);

  const maxHour = Math.max(...demandByHour);
  const peakHour = maxHour > 0 ? demandByHour.indexOf(maxHour) : null;

  return { byLevel, topCustomers, demandByHour, peakHour };
}

export interface ScheduledOrderRow {
  id: string;
  vendorName: string;
  studentName: string;
  deliverTo: string | null;
  deliverAt: number | null;
  itemCostTsh: number;
  totalTsh: number;
  hasHotMeal: boolean;
}

/** Scheduled orders still awaiting a courier — the admin dispatch queue. */
export async function listScheduledOrders(): Promise<ScheduledOrderRow[]> {
  const rows = await db
    .select()
    .from(schema.orders)
    .where(and(eq(schema.orders.status, "scheduled"), isNull(schema.orders.courierId)))
    .orderBy(asc(schema.orders.deliverAt));
  if (rows.length === 0) return [];

  const [vendors, students, items] = await Promise.all([
    db.select().from(schema.vendors),
    db.select().from(schema.students),
    db.select().from(schema.orderItems),
  ]);
  const vById = new Map(vendors.map((v) => [v.id, v]));
  const sById = new Map(students.map((s) => [s.id, s]));

  return rows.map((o) => ({
    id: o.id,
    vendorName: vById.get(o.vendorId)?.name ?? "Unknown",
    studentName: sById.get(o.studentId)?.name ?? "Student",
    deliverTo: o.deliverTo,
    deliverAt: o.deliverAt,
    itemCostTsh: o.itemCostTsh,
    totalTsh: o.totalTsh,
    hasHotMeal: items
      .filter((i) => i.orderId === o.id)
      .some((i) => isHotMeal(i.category as MenuCategory)),
  }));
}

export interface AssignableCourier {
  id: string;
  name: string;
  depositTsh: number;
  ceilingTsh: number;
  isOnline: boolean;
}

/** Active couriers the admin can assign a scheduled order to. */
export async function listAssignableCouriers(): Promise<AssignableCourier[]> {
  const rows = await db
    .select({ courier: schema.couriers, name: schema.students.name })
    .from(schema.couriers)
    .innerJoin(schema.students, eq(schema.couriers.studentId, schema.students.id))
    .where(eq(schema.couriers.status, "active"))
    .orderBy(desc(schema.couriers.isOnline));
  return rows.map((r) => ({
    id: r.courier.id,
    name: r.name,
    depositTsh: r.courier.depositTsh,
    ceilingTsh: orderCeiling(r.courier.depositTsh),
    isOnline: r.courier.isOnline,
  }));
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
