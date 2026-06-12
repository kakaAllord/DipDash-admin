/*
  Escrow state machine.

  held --handoff ok--> released
  held --issue--> frozen --admin fault--> deducted (+ student refunded)
                         --admin no-fault--> released

  On a fault resolution: deduct the meal (item) cost from the courier's deposit,
  refund the student, and restrict the courier until the deposit is topped back
  to the minimum threshold.
*/

export type EscrowState =
  | "held"
  | "released"
  | "frozen"
  | "deducted"
  | "refunded";

const ESCROW_FORWARD: Record<EscrowState, EscrowState[]> = {
  held: ["released", "frozen"],
  frozen: ["released", "deducted"],
  released: [],
  deducted: ["refunded"],
  refunded: [],
};

export function canEscrowTransition(
  from: EscrowState,
  to: EscrowState
): boolean {
  return ESCROW_FORWARD[from].includes(to);
}

export interface FaultResolution {
  /** Amount deducted from the courier's deposit (the meal/item cost). */
  deductionTsh: number;
  /** Amount refunded to the student (meal cost + delivery fee). */
  refundTsh: number;
  newDepositTsh: number;
  /** Whether the courier must top up before working again. */
  restrict: boolean;
}

export function resolveCourierFault(args: {
  itemCostTsh: number;
  deliveryFeeTsh: number;
  courierDepositTsh: number;
  minDepositTsh: number;
}): FaultResolution {
  const { itemCostTsh, deliveryFeeTsh, courierDepositTsh, minDepositTsh } =
    args;
  const deductionTsh = Math.min(itemCostTsh, courierDepositTsh);
  const newDepositTsh = courierDepositTsh - deductionTsh;
  return {
    deductionTsh,
    refundTsh: itemCostTsh + deliveryFeeTsh,
    newDepositTsh,
    restrict: newDepositTsh < minDepositTsh,
  };
}
