import "server-only";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import type { Order, OrderItem } from "@/lib/db/schema";

export interface OrderWithDetail extends Order {
  items: OrderItem[];
  vendorName: string;
  vendorLocation: string;
  courierName?: string | null;
  studentName?: string;
}

async function hydrate(orders: Order[]): Promise<OrderWithDetail[]> {
  if (orders.length === 0) return [];
  const [allItems, vendors, couriers, students] = await Promise.all([
    db.select().from(schema.orderItems),
    db.select().from(schema.vendors),
    db.select().from(schema.couriers),
    db.select().from(schema.students),
  ]);
  const vById = new Map(vendors.map((v) => [v.id, v]));
  const cById = new Map(couriers.map((c) => [c.id, c]));
  const sById = new Map(students.map((s) => [s.id, s]));

  return orders.map((o) => {
    const vendor = vById.get(o.vendorId);
    const courier = o.courierId ? cById.get(o.courierId) : null;
    const courierStudent = courier ? sById.get(courier.studentId) : null;
    return {
      ...o,
      items: allItems.filter((i) => i.orderId === o.id),
      vendorName: vendor?.name ?? "Unknown",
      vendorLocation: vendor?.location ?? "in_campus",
      courierName: courierStudent?.name ?? null,
      studentName: sById.get(o.studentId)?.name,
    };
  });
}

export async function getStudentOrders(studentId: string) {
  const rows = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.studentId, studentId))
    .orderBy(desc(schema.orders.createdAt));
  return hydrate(rows);
}

export async function getOrder(orderId: string) {
  const rows = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId))
    .limit(1);
  if (!rows[0]) return null;
  return (await hydrate(rows))[0];
}

export async function listAllOrders() {
  const rows = await db
    .select()
    .from(schema.orders)
    .orderBy(desc(schema.orders.createdAt));
  return hydrate(rows);
}
