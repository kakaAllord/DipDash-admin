/*
  Courier risk management.

  - Minimum deposit to go active: 2,000 TSh.
  - Risk ceiling: a courier may accept any order whose retail (item) value is up
    to 90% of their current security deposit (not 100%).
      2,000 deposit -> 1,800 ceiling (light items only).
  - Hot-meals tier unlocks once the deposit reaches 10,000 TSh.
  - Earnings: the courier keeps 50% of every delivery fee (the rest is the
    platform's cut). Earnings are spendable — couriers can move them into their
    deposit (to lift the ceiling / unlock hot meals) or cash them out.
*/

export const RISK = {
  minDepositTsh: 2_000,
  riskCeilingRatio: 0.9,
  hotMealsThresholdTsh: 10_000,
  /** Courier's share of each delivery fee. */
  earningRate: 0.5,
  /** Minimum earnings balance before a cash-out can be requested. */
  payoutThresholdTsh: 5_000,
} as const;

export function orderCeiling(depositTsh: number): number {
  return Math.floor(depositTsh * RISK.riskCeilingRatio);
}

export function hotMealsUnlocked(depositTsh: number): boolean {
  return depositTsh >= RISK.hotMealsThresholdTsh;
}

export function canGoActive(depositTsh: number): boolean {
  return depositTsh >= RISK.minDepositTsh;
}

/** The courier's earning for a delivery: 50% of the delivery fee (rounded). */
export function courierEarning(deliveryFeeTsh: number): number {
  return Math.round(deliveryFeeTsh * RISK.earningRate);
}

export interface AcceptCheck {
  ok: boolean;
  reason?: string;
}

/**
 * Can this courier accept an order of the given item value, considering both
 * the 90% ceiling and whether the order contains hot meals.
 */
export function canAcceptOrder(args: {
  depositTsh: number;
  itemCostTsh: number;
  hasHotMeal: boolean;
}): AcceptCheck {
  const { depositTsh, itemCostTsh, hasHotMeal } = args;

  if (!canGoActive(depositTsh)) {
    return { ok: false, reason: "Deposit below 2,000 TSh minimum" };
  }
  if (hasHotMeal && !hotMealsUnlocked(depositTsh)) {
    return {
      ok: false,
      reason: "Hot meals locked until deposit reaches 10,000 TSh",
    };
  }
  if (itemCostTsh > orderCeiling(depositTsh)) {
    return {
      ok: false,
      reason: `Order value exceeds your ceiling of ${orderCeiling(
        depositTsh
      ).toLocaleString("en-US")} TSh`,
    };
  }
  return { ok: true };
}
