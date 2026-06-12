import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
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
  passwordHash: text("password_hash"), // null until first-time setup completes
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(nowMs),
});

/** One-time codes for simulated SMS (OTP login + courier activation). */
export const otps = pgTable("otps", {
  id: text("id").primaryKey(),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  purpose: text("purpose").notNull(), // 'login' | 'courier_activation'
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  consumedAt: bigint("consumed_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(nowMs),
});

export const vendors = pgTable("vendors", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(), // 'in_campus' | 'out_campus'
  blurb: text("blurb"),
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
  idCardImage: text("id_card_image"), // base64 data URL (prototype)
  selfieImage: text("selfie_image"),
  activationToken: text("activation_token"),
  activatedAt: bigint("activated_at", { mode: "number" }),
  isOnline: boolean("is_online").notNull().default(false),
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
  // 'pending_payment' | 'paid' | 'accepted' | 'collected' | 'delivered' | 'disputed' | 'refunded'
  status: text("status").notNull().default("pending_payment"),
  itemCostTsh: integer("item_cost_tsh").notNull(),
  deliveryFeeTsh: integer("delivery_fee_tsh").notNull(),
  totalTsh: integer("total_tsh").notNull(),
  isNightSurge: boolean("is_night_surge").notNull().default(false),
  confirmationPin: text("confirmation_pin").notNull(), // student -> courier at handoff
  pickupToken: text("pickup_token").notNull(), // courier -> vendor at counter
  deliverTo: text("deliver_to"), // hostel / location note
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

export const adminUsers = pgTable("admin_users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
});

// Inferred row types for use across the app
export type Student = typeof students.$inferSelect;
export type Vendor = typeof vendors.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type Courier = typeof couriers.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type EscrowTxn = typeof escrowTxns.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
