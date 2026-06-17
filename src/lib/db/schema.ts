import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  doublePrecision,
  integer,
  pgTable,
  text,
} from "drizzle-orm/pg-core";

/*
  Dipdash schema (PostgreSQL via Drizzle).
  Money is stored in whole TSh (integers). Timestamps are epoch milliseconds
  (bigint, mode "number" — safe: ms-since-epoch is well within MAX_SAFE_INTEGER).
  String unions are documented in comments and enforced at the domain layer.

  NOTE: this schema is intentionally duplicated across the three Dipdash repos
  (student / courier / admin). They share ONE central Postgres database; keep
  the table definitions identical when changing them.
*/

const nowMs = sql`(extract(epoch from now()) * 1000)::bigint`;

export const students = pgTable("students", {
  id: text("id").primaryKey(),
  admissionNo: text("admission_no").notNull().unique(),
  phone: text("phone").notNull(),
  name: text("name").notNull(),
  course: text("course"),
  level: text("level"),
  passwordHash: text("password_hash"), // null until first-time setup completes
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(nowMs),
});

export const vendors = pgTable("vendors", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(), // 'in_campus' | 'out_campus'
  blurb: text("blurb"),
  lat: doublePrecision("lat"), // pickup coordinates (for distance + maps)
  lng: doublePrecision("lng"),
  isOpen: boolean("is_open").notNull().default(true),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(nowMs),
});

export const menuItems = pgTable("menu_items", {
  id: text("id").primaryKey(),
  vendorId: text("vendor_id")
    .notNull()
    .references(() => vendors.id),
  name: text("name").notNull(),
  // 'soda' | 'juice' | 'fruits' | 'chips_yai' | 'chips_kavu' | 'wali_nyama' | 'pilau_nyama' | 'mixer_nyama'
  category: text("category").notNull(),
  priceTsh: integer("price_tsh").notNull(),
  inStock: boolean("in_stock").notNull().default(true),
});

export const couriers = pgTable("couriers", {
  id: text("id").primaryKey(),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id),
  // 'pending' | 'approved' | 'active' | 'restricted'
  status: text("status").notNull().default("pending"),
  course: text("course"),
  gender: text("gender"), // 'male' | 'female' — captured at application
  idCardImage: text("id_card_image"), // base64 data URL (prototype)
  selfieImage: text("selfie_image"),
  activationToken: text("activation_token"),
  activatedAt: bigint("activated_at", { mode: "number" }),
  isOnline: boolean("is_online").notNull().default(false),
  lastLat: doublePrecision("last_lat"), // last-known live location
  lastLng: doublePrecision("last_lng"),
  lastLocationAt: bigint("last_location_at", { mode: "number" }),
  depositTsh: integer("deposit_tsh").notNull().default(0),
  lockedWalletTsh: integer("locked_wallet_tsh").notNull().default(0),
  earningsTsh: integer("earnings_tsh").notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(nowMs),
});

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id),
  vendorId: text("vendor_id")
    .notNull()
    .references(() => vendors.id),
  courierId: text("courier_id").references(() => couriers.id),
  // 'finding_courier' | 'pending_payment' | 'scheduled' | 'paid' | 'accepted' | 'collected' | 'delivered' | 'disputed' | 'refunded'
  status: text("status").notNull().default("pending_payment"),
  // 'instant' | 'scheduled' — how the order is dispatched
  deliveryKind: text("delivery_kind").notNull().default("scheduled"),
  itemCostTsh: integer("item_cost_tsh").notNull(),
  deliveryFeeTsh: integer("delivery_fee_tsh").notNull(),
  totalTsh: integer("total_tsh").notNull(),
  surgeTsh: integer("surge_tsh").notNull().default(0), // admin surge add-on applied
  confirmationPin: text("confirmation_pin").notNull(), // student -> courier at handoff
  pickupToken: text("pickup_token").notNull(), // courier -> vendor at counter
  deliverTo: text("deliver_to"), // hostel / location note
  deliverLat: doublePrecision("deliver_lat"), // drop-off coordinates
  deliverLng: doublePrecision("deliver_lng"),
  deliverAt: bigint("deliver_at", { mode: "number" }), // requested delivery time
  deliverWindowMin: integer("deliver_window_min").notNull().default(20),
  // lifecycle timestamps (epoch ms)
  t0PlacedAt: bigint("t0_placed_at", { mode: "number" }),
  t1AcceptedAt: bigint("t1_accepted_at", { mode: "number" }),
  t2CollectedAt: bigint("t2_collected_at", { mode: "number" }),
  t3DeliveredAt: bigint("t3_delivered_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(nowMs),
});

export const orderItems = pgTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id),
  menuItemId: text("menu_item_id")
    .notNull()
    .references(() => menuItems.id),
  nameSnapshot: text("name_snapshot").notNull(),
  category: text("category").notNull(),
  qty: integer("qty").notNull(),
  unitPriceTsh: integer("unit_price_tsh").notNull(),
});

export const escrowTxns = pgTable("escrow_txns", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id),
  // 'held' | 'released' | 'frozen' | 'deducted' | 'refunded'
  state: text("state").notNull(),
  amountTsh: integer("amount_tsh").notNull(),
  note: text("note"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(nowMs),
});

/** Student's rating + comment on the courier for a delivered order. */
export const ratings = pgTable("ratings", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id)
    .unique(),
  courierId: text("courier_id")
    .notNull()
    .references(() => couriers.id),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id),
  stars: integer("stars").notNull(), // 1..5
  comment: text("comment"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(nowMs),
});

export const adminUsers = pgTable("admin_users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
});

/*
  Courier cash-out request. Couriers claim from 5,000 TSh; the platform pays out
  within 12 h (recorded here, marked `paid` when settled). Moving earnings to the
  deposit instead is handled directly on the courier row (no payout row).
*/
export const payouts = pgTable("payouts", {
  id: text("id").primaryKey(),
  courierId: text("courier_id")
    .notNull()
    .references(() => couriers.id),
  amountTsh: integer("amount_tsh").notNull(),
  status: text("status").notNull().default("requested"), // 'requested' | 'paid'
  requestedAt: bigint("requested_at", { mode: "number" }).notNull().default(nowMs),
  paidAt: bigint("paid_at", { mode: "number" }),
});

/*
  Admin-controlled delivery surge. Replaces the old automatic night surge: an
  admin sets a flat add-on per location (in/out campus) with a reason and an
  optional auto-end time. At most one row should be active at a time; an expired
  (endsAt < now) or inactive row is ignored by getActiveSurge().
*/
export const surges = pgTable("surges", {
  id: text("id").primaryKey(),
  reason: text("reason").notNull(), // "Heavy rain", "Late night", ...
  inCampusTsh: integer("in_campus_tsh").notNull().default(0),
  outCampusTsh: integer("out_campus_tsh").notNull().default(0),
  startsAt: bigint("starts_at", { mode: "number" }).notNull().default(nowMs),
  endsAt: bigint("ends_at", { mode: "number" }), // null = until manually terminated
  active: boolean("is_active").notNull().default(true),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(nowMs),
});

// Inferred row types for use across the app
export type Student = typeof students.$inferSelect;
export type Vendor = typeof vendors.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type Courier = typeof couriers.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type EscrowTxn = typeof escrowTxns.$inferSelect;
export type Rating = typeof ratings.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type Surge = typeof surges.$inferSelect;
export type Payout = typeof payouts.$inferSelect;
