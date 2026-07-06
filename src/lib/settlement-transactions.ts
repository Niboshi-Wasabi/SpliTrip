/**
 * Settlement transfer persistence helpers (mark-as-paid rows).
 * 送金済みマーク用の settlement_transactions ヘルパー。
 */

import type { GroupSettlement } from "@/lib/group-ledger";

export type SettlementTransactionRow = {
  from_user_id: string;
  to_user_id: string;
  amount: string | number;
  currency_code: string;
  marked_at: string;
  status: string;
};

/** Stable pair key without row index (survives reorder after expense edits). */
export function buildSettlementPairKey(
  fromUserId: string,
  toUserId: string,
): string {
  return `${fromUserId}::${toUserId}`;
}

function amountsMatchWithinTolerance(
  leftAmount: number,
  rightAmount: number,
): boolean {
  return Math.abs(leftAmount - rightAmount) < 0.01;
}

/**
 * Merge DB paid rows into computed settlement lines.
 * 計算済み精算行に DB の送金済み状態をマージする。
 */
export function applyPaidStatusToSettlements(
  settlements: GroupSettlement[],
  paidRows: SettlementTransactionRow[],
): GroupSettlement[] {
  const paidByPairKey = new Map<string, SettlementTransactionRow>();
  for (const paidRow of paidRows) {
    if (paidRow.status !== "paid") {
      continue;
    }
    paidByPairKey.set(
      buildSettlementPairKey(paidRow.from_user_id, paidRow.to_user_id),
      paidRow,
    );
  }

  return settlements.map((settlementRow) => {
    const pairKey = buildSettlementPairKey(
      settlementRow.fromUserId,
      settlementRow.toUserId,
    );
    const paidRow = paidByPairKey.get(pairKey);
    if (!paidRow) {
      return { ...settlementRow, isMarkedPaid: false, markedPaidAt: null };
    }

    const paidAmount = Number(paidRow.amount);
    const amountStillMatches = amountsMatchWithinTolerance(
      settlementRow.amount,
      paidAmount,
    );

    return {
      ...settlementRow,
      isMarkedPaid: amountStillMatches,
      markedPaidAt: amountStillMatches ? paidRow.marked_at : null,
      paidAmountSnapshot: amountStillMatches ? paidAmount : null,
    };
  });
}

/**
 * Sum what `userId` still owes across settlement lines (unpaid debtor rows).
 */
export function sumUnsettledOwedByUser(
  settlements: GroupSettlement[],
  userId: string,
): number {
  return settlements.reduce((runningTotal, settlementRow) => {
    if (settlementRow.fromUserId !== userId || settlementRow.isMarkedPaid) {
      return runningTotal;
    }
    return runningTotal + settlementRow.amount;
  }, 0);
}
