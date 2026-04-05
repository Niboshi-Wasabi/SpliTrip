/**
 * Lightweight validators shared by expense APIs (membership subset checks, etc.).
 */

const SUM_EPSILON = 0.02;

export type ManualSplitInput = { user_id: string; amount: number };

/** True if manual split line amounts sum to the expense total within epsilon. */
export function validateSplitSumMatchesExpense(
  expenseAmount: number,
  splits: ManualSplitInput[],
): { ok: true } | { ok: false; code: "split_sum_mismatch" } {
  const totalExpense = Number(expenseAmount);
  if (!Number.isFinite(totalExpense) || totalExpense <= 0) {
    return { ok: false, code: "split_sum_mismatch" };
  }

  const sumSplits = splits.reduce(
    (accumulator, splitRow) => accumulator + Number(splitRow.amount),
    0,
  );
  if (Math.abs(sumSplits - totalExpense) > SUM_EPSILON) {
    return { ok: false, code: "split_sum_mismatch" };
  }

  return { ok: true };
}

/** Every split user id must exist in the group's member set. */
export function splitUsersAreSubsetOfMembers(
  splitUserIds: string[],
  memberIds: Set<string>,
): boolean {
  for (const userId of splitUserIds) {
    if (!memberIds.has(userId)) {
      return false;
    }
  }
  return true;
}
