/**
 * In-memory ledger helpers: net balances and named settlement rows for a group.
 */

import {
  computeSimplifiedTransfers,
  type SimplifiedTransfer,
} from "@/lib/simplify-debts";

export type ExpenseWithSplits = {
  payer_id: string;
  amount: number;
  splits: { user_id: string; amount: number }[];
};

/**
 * Net balance per user: total paid (as payer) minus total owed (from splits).
 */
export function computeNetBalances(
  expenses: ExpenseWithSplits[],
): Record<string, number> {
  const netBalanceByUserId: Record<string, number> = {};

  for (const expense of expenses) {
    const paidAmount = Number(expense.amount);
    if (!Number.isFinite(paidAmount)) {
      continue;
    }

    netBalanceByUserId[expense.payer_id] =
      (netBalanceByUserId[expense.payer_id] ?? 0) + paidAmount;

    for (const split of expense.splits) {
      const owedShare = Number(split.amount);
      if (!Number.isFinite(owedShare)) {
        continue;
      }
      netBalanceByUserId[split.user_id] =
        (netBalanceByUserId[split.user_id] ?? 0) - owedShare;
    }
  }

  return netBalanceByUserId;
}

/** One simplified transfer with human-readable endpoints for the UI. */
export type GroupSettlement = {
  fromUserId: string;
  toUserId: string;
  fromDisplayName: string;
  toDisplayName: string;
  amount: number;
  /** Persisted mark-as-paid when amount still matches snapshot. */
  isMarkedPaid: boolean;
  markedPaidAt?: string | null;
  paidAmountSnapshot?: number | null;
};

export function computeGroupSettlements(
  expenses: ExpenseWithSplits[],
  displayNameByUserId: Record<string, string>,
): GroupSettlement[] {
  const netBalanceByUserId = computeNetBalances(expenses);
  const rawTransfers = computeSimplifiedTransfers(netBalanceByUserId);

  return rawTransfers.map((transfer: SimplifiedTransfer) => ({
    fromUserId: transfer.fromUserId,
    toUserId: transfer.toUserId,
    fromDisplayName:
      displayNameByUserId[transfer.fromUserId] ?? transfer.fromUserId,
    toDisplayName: displayNameByUserId[transfer.toUserId] ?? transfer.toUserId,
    amount: transfer.amount,
    isMarkedPaid: false,
    markedPaidAt: null,
  }));
}
