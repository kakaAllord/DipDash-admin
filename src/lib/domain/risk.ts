/*
  Courier risk management.

  - Minimum deposit to go active: 2,000 TSh.
  - Risk ceiling: a courier may not accept an order whose retail (item) value
    exceeds 80% of their current security deposit.
      2,000 deposit -> 1,600 ceiling (light items only).
  - Hot-meals tier unlocks once the deposit reaches 10,000 TSh.
  - Earn-to-deposit: until the deposit reaches 10,000, a slice of each delivery
    payout is withheld into the deposit (locked wallet) instead of paid out.
*/

export const RISK = {
  minDepositTsh: 2_000,
  riskCeilingRatio: 0.8,
  hotMealsThresholdTsh: 10_000,
  /** Fraction of each delivery fee withheld toward the deposit while scaling. */
  withholdRate: 0.5,
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

export interface AcceptCheck {
  ok: boolean;
  reason?: string;
}

/**
 * Can this courier accept an order of the given item value, considering both
 * the 80% ceiling and whether the order contains hot meals.
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

export interface PayoutSplit {
  /** Paid to the courier's spendable earnings. */
  toEarningsTsh: number;
  /** Withheld toward the deposit (locked wallet). */
  withheldTsh: number;
  /** Courier's deposit after this payout. */
  newDepositTsh: number;
}

/**
 * Split a completed delivery's payout. While scaling toward the threshold a
 * portion is withheld into the deposit; the withholding never overshoots the
 * threshold. Once at/over the threshold, the full fee is paid out.
 */
export function computePayoutSplit(
  depositTsh: number,
  deliveryFeeTsh: number
): PayoutSplit {
  if (hotMealsUnlocked(depositTsh)) {
    return {
      toEarningsTsh: deliveryFeeTsh,
      withheldTsh: 0,
      newDepositTsh: depositTsh,
    };
  }

  const room = RISK.hotMealsThresholdTsh - depositTsh;
  const desiredWithhold = Math.round(deliveryFeeTsh * RISK.withholdRate);
  const withheldTsh = Math.min(desiredWithhold, room);

  return {
    toEarningsTsh: deliveryFeeTsh - withheldTsh,
    withheldTsh,
    newDepositTsh: depositTsh + withheldTsh,
  };
}
