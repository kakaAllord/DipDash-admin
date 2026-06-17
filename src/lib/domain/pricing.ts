import type { MenuCategory, VendorLocation } from "./catalog";

/*
  Delivery Fee = Base (300) + Location Surcharge + Admin Surge

  - Base: 300 TSh, always.
  - Location surcharge: out-of-campus heavy items (chips) add 200 TSh PER PLATE
    (anti-clustering — heavy/high-risk loads are charged per item, not per order).
  - Admin surge: a flat add-on an admin can switch on (e.g. bad weather, late
    night), resolved per location. Replaces the old automatic 19:00 night surge.
    The amount is fetched from the DB and passed in as `surgeTsh` — this function
    stays pure.

  Verified against PRD examples (see verify-domain.ts):
    in-campus anything                 -> 300
    out-campus soda/juice/fruit        -> 300
    out-campus 1x chips                -> 500
    out-campus 2x chips                -> 700
    out-campus 1x chips + 200 surge    -> 700
*/

export const PRICING = {
  baseFee: 300,
  surchargePerPlate: 200,
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
  /** Admin surge add-on for this location (resolved from the DB), 0 if none. */
  surgeTsh?: number;
}

export interface PricingResult {
  baseFee: number;
  locationSurcharge: number;
  surgeTsh: number;
  deliveryFee: number;
}

export function computeDeliveryFee(input: PricingInput): PricingResult {
  const { location, lines } = input;
  const surgeTsh = Math.max(0, Math.round(input.surgeTsh ?? 0));

  let locationSurcharge = 0;
  if (location === "out_campus") {
    for (const line of lines) {
      if (PRICING.surchargeCategories.has(line.category)) {
        locationSurcharge += PRICING.surchargePerPlate * line.qty;
      }
    }
  }

  return {
    baseFee: PRICING.baseFee,
    locationSurcharge,
    surgeTsh,
    deliveryFee: PRICING.baseFee + locationSurcharge + surgeTsh,
  };
}
