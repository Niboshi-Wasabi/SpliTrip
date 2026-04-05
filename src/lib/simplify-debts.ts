/**
 * Simplify-debts: net balances are matched greedily between debtors and creditors
 * to minimize the number of settlement transfers.
 * Amounts are rounded to whole currency units; balances within ±ROUNDING_THRESHOLD are ignored.
 */

export type SimplifiedTransfer = {
  fromUserId: string;
  toUserId: string;
  /** Transfer amount in major display units (rounded integer where applicable). */
  amount: number;
};

const ROUNDING_THRESHOLD = 0.5;

/**
 * @param netBalanceByUserId - paid − owed share; positive = creditor, negative = debtor.
 */
export function computeSimplifiedTransfers(
  netBalanceByUserId: Record<string, number>,
): SimplifiedTransfer[] {
  const debtors: { userId: string; amount: number }[] = [];
  const creditors: { userId: string; amount: number }[] = [];

  for (const [userId, balance] of Object.entries(netBalanceByUserId)) {
    if (balance < -ROUNDING_THRESHOLD) {
      debtors.push({ userId, amount: Math.abs(balance) });
    } else if (balance > ROUNDING_THRESHOLD) {
      creditors.push({ userId, amount: balance });
    }
  }

  debtors.sort((left, right) => right.amount - left.amount);
  creditors.sort((left, right) => right.amount - left.amount);

  const transfers: SimplifiedTransfer[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const settledAmount = Math.min(
      debtors[debtorIndex].amount,
      creditors[creditorIndex].amount,
    );

    if (settledAmount > ROUNDING_THRESHOLD) {
      transfers.push({
        fromUserId: debtors[debtorIndex].userId,
        toUserId: creditors[creditorIndex].userId,
        amount: Math.round(settledAmount),
      });
    }

    debtors[debtorIndex].amount -= settledAmount;
    creditors[creditorIndex].amount -= settledAmount;

    if (debtors[debtorIndex].amount < ROUNDING_THRESHOLD) {
      debtorIndex++;
    }
    if (creditors[creditorIndex].amount < ROUNDING_THRESHOLD) {
      creditorIndex++;
    }
  }

  return transfers;
}
