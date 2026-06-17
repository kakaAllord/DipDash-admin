/*
  Order lifecycle and the four operational timestamps.

  Two dispatch paths:
    Instant   : finding_courier --accept--> pending_payment --pay--> accepted
    Scheduled : scheduled (paid up front) --assign/accept--> accepted
  Both then:  accepted --collect--> collected --handoff(PIN)--> delivered
  Disputes :  (scheduled|accepted|collected) --dispute--> disputed --resolve--> refunded

  Timestamps:
    T0 placed     (instant: courier matched; scheduled: paid & submitted)
    T1 accepted   (courier on the way)
    T2 collected  (courier shows pickup token at counter)
    T3 delivered  (student enters confirmation PIN at handoff)
*/

export type OrderStatus =
  | "finding_courier"
  | "pending_payment"
  | "scheduled"
  | "paid"
  | "accepted"
  | "collected"
  | "delivered"
  | "disputed"
  | "refunded";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  finding_courier: "Finding courier",
  pending_payment: "Awaiting payment",
  scheduled: "Scheduled",
  paid: "Finding courier",
  accepted: "Courier on the way",
  collected: "Picked up",
  delivered: "Delivered",
  disputed: "Disputed",
  refunded: "Refunded",
};

/** Tone keys map to the status color ramp in globals.css / Badge tones. */
export const ORDER_STATUS_TONE: Record<
  OrderStatus,
  "neutral" | "info" | "accent" | "primary" | "danger"
> = {
  finding_courier: "info",
  pending_payment: "neutral",
  scheduled: "info",
  paid: "info",
  accepted: "accent",
  collected: "primary",
  delivered: "primary",
  disputed: "danger",
  refunded: "danger",
};

const FORWARD: Partial<Record<OrderStatus, OrderStatus>> = {
  finding_courier: "pending_payment",
  pending_payment: "accepted",
  scheduled: "accepted",
  paid: "accepted",
  accepted: "collected",
  collected: "delivered",
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (to === "disputed") {
    return (
      from === "paid" ||
      from === "scheduled" ||
      from === "accepted" ||
      from === "collected"
    );
  }
  if (to === "refunded") return from === "disputed";
  return FORWARD[from] === to;
}

export interface LifecycleTimestamps {
  t0PlacedAt?: number | null;
  t1AcceptedAt?: number | null;
  t2CollectedAt?: number | null;
  t3DeliveredAt?: number | null;
}

export interface CycleMetrics {
  matchMs: number | null; // T1 - T0
  prepMs: number | null; // T2 - T1
  transitMs: number | null; // T3 - T2
  totalMs: number | null; // T3 - T0
}

export function cycleMetrics(t: LifecycleTimestamps): CycleMetrics {
  const diff = (a?: number | null, b?: number | null) =>
    a != null && b != null ? b - a : null;
  return {
    matchMs: diff(t.t0PlacedAt, t.t1AcceptedAt),
    prepMs: diff(t.t1AcceptedAt, t.t2CollectedAt),
    transitMs: diff(t.t2CollectedAt, t.t3DeliveredAt),
    totalMs: diff(t.t0PlacedAt, t.t3DeliveredAt),
  };
}
