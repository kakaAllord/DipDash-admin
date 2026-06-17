/*
  Delivery scheduling rules.
  Scheduled deliveries may only be requested between 19:00 and 22:00.
  The "auto-open" window hands an undispatched scheduled order to the courier
  pool when it's within 40 minutes of its delivery time.
*/
export const DELIVERY_WINDOW = { startHour: 19, endHour: 22 } as const;
export const AUTO_OPEN_LEAD_MS = 40 * 60 * 1000;

/** True if the given epoch-ms time-of-day falls within 19:00–22:00. */
export function isWithinDeliveryWindow(at: number): boolean {
  const d = new Date(at);
  const mins = d.getHours() * 60 + d.getMinutes();
  return mins >= DELIVERY_WINDOW.startHour * 60 && mins <= DELIVERY_WINDOW.endHour * 60;
}

/** A scheduled, unassigned order is auto-opened to couriers within the lead time. */
export function isAutoOpen(deliverAt: number | null, now = Date.now()): boolean {
  if (deliverAt == null) return false;
  return deliverAt - now <= AUTO_OPEN_LEAD_MS;
}
