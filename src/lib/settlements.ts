/**
 * Legacy trip-dashboard settlement helper: maps user ids to display names.
 */

import { computeSimplifiedTransfers } from "@/lib/simplify-debts";

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

/**
 * @param balances - paid − owed share per user (positive = creditor).
 * @param names - display label per user id for the UI list.
 */
export function computeSettlements(
  balances: Record<string, number>,
  names: Record<string, string>,
): Settlement[] {
  return computeSimplifiedTransfers(balances).map((transfer) => ({
    from: names[transfer.fromUserId] ?? transfer.fromUserId,
    to: names[transfer.toUserId] ?? transfer.toUserId,
    amount: transfer.amount,
  }));
}
