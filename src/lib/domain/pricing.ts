import type { MenuCategory, VendorLocation } from "./catalog";

/*
  Delivery Fee = Base (200) + Location Surcharge + Night Surge

  - Base: 200 TSh, always.
  - Location surcharge: out-of-campus heavy items (chips) add 200 TSh PER PLATE
    (anti-clustering — heavy/high-risk loads are charged per item, not per order).
  - Night surge: from 19:00 onward, a flat +200 TSh across the whole order.

  Verified against PRD examples (see pricing.test.ts):
    in-campus anything           -> 200
    out-campus soda/juice/fruit  -> 200
    out-campus 1x chips          -> 400
    out-campus 2x chips          -> 600
    in-campus hot meal @19:00    -> 400
    out-campus chips @19:00      -> 600
*/

export const PRICING = {
  baseFee: 200,
  surchargePerPlate: 200,
  nightSurge: 200,
  nightStartHour: 19,
  /** Out-of-campus items that incur the per-plate location surcharge. */
  surchargeCategories: new Set<MenuCategory>(["chips_yai", "chips_kavu"]),
} as const;

export interface PricingLine {
  category: MenuCategory;
  qty: number;
}

export interface PricingInput {
  location: VendorLocation;
  lines: PricingLine[];
  /** Time used to evaluate the night surge (pass the demo clock if forcing). */
  at: Date;
}

export interface PricingResult {
  baseFee: number;
  locationSurcharge: number;
  nightSurge: number;
  deliveryFee: number;
  isNightSurge: boolean;
}

export function isNightSurge(at: Date): boolean {
  return at.getHours() >= PRICING.nightStartHour;
}

export function computeDeliveryFee(input: PricingInput): PricingResult {
  const { location, lines, at } = input;

  let locationSurcharge = 0;
  if (location === "out_campus") {
    for (const line of lines) {
      if (PRICING.surchargeCategories.has(line.category)) {
        locationSurcharge += PRICING.surchargePerPlate * line.qty;
      }
    }
  }

  const night = isNightSurge(at);
  const nightSurge = night ? PRICING.nightSurge : 0;

  return {
    baseFee: PRICING.baseFee,
    locationSurcharge,
    nightSurge,
    deliveryFee: PRICING.baseFee + locationSurcharge + nightSurge,
    isNightSurge: night,
  };
}
