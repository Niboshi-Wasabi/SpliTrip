import {
  computeEqualSplitParts,
  type RemainderPolicy,
} from "@/utils/settlement";

/** One member's share of an equally split expense (amount + ratio for persistence). */
export type EqualSplitPart = {
  userId: string;
  amount: number;
  ratio: number;
};

/**
 * Divide `totalAmount` evenly across `memberUserIds` using currency-aware minor units.
 */
export function buildEqualExpenseSplits(
  totalAmount: number,
  memberUserIds: string[],
  currencyCode: string,
  policy: RemainderPolicy = { kind: "largest_remainder" },
): EqualSplitPart[] {
  return computeEqualSplitParts(
    totalAmount,
    memberUserIds,
    currencyCode,
    policy,
  );
}
