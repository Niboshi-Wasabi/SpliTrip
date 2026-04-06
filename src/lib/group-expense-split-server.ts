/**
 * Server-side construction of expense split rows from API request bodies.
 * Delegates arithmetic to `src/utils/settlement.ts` for consistency with the client UI.
 */

import { buildEqualExpenseSplits } from "@/lib/equal-split";
import { splitUsersAreSubsetOfMembers } from "@/lib/group-expense-validate";
import {
  computeItemizedSplitParts,
  computePercentSplitParts,
  computeShareSplitParts,
  finalizeExactAmountSplits,
  type ItemizedLineInput,
  type PercentSplitInput,
  type RemainderPolicy,
  type ShareSplitInput,
  type SplitPart,
  toMinorUnits,
} from "@/utils/settlement";

export type SplitMode =
  | "equal"
  | "exact"
  | "shares"
  | "percent"
  | "itemized";

/** Map JSON `remainder_policy` from the client into a typed `RemainderPolicy`. */
export function parseRemainderPolicy(
  raw: unknown,
  payerId: string,
  memberIds: Set<string>,
): RemainderPolicy {
  if (raw === null || typeof raw !== "object") {
    return { kind: "largest_remainder" };
  }
  const payload = raw as { type?: unknown; user_id?: unknown };
  const policyType = String(payload.type ?? "largest_remainder");
  if (policyType === "payer") {
    return { kind: "payer", payerId };
  }
  if (policyType === "specific_user") {
    const designatedUserId = String(payload.user_id ?? "");
    if (memberIds.has(designatedUserId)) {
      return { kind: "specific_user", userId: designatedUserId };
    }
    return { kind: "largest_remainder" };
  }
  if (policyType === "first_member") {
    return { kind: "first_in_member_list" };
  }
  return { kind: "largest_remainder" };
}

/** Convert pure split parts to Supabase `expense_splits` row shape. */
function splitPartsToInsertRows(parts: SplitPart[]): {
  user_id: string;
  amount: number;
  ratio: number;
}[] {
  return parts.map((part) => ({
    user_id: part.userId,
    amount: part.amount,
    ratio: part.ratio,
  }));
}

export function buildExpenseSplitRows(options: {
  splitMode: SplitMode;
  amount: number;
  currencyCode: string;
  memberUserIds: string[];
  memberIds: Set<string>;
  payerId: string;
  policy: RemainderPolicy;
  body: {
    manual_splits?: unknown;
    share_inputs?: unknown;
    percent_inputs?: unknown;
    itemized_lines?: unknown;
  };
}):
  | { ok: true; splitRows: { user_id: string; amount: number; ratio: number }[] }
  | { ok: false; error: string } {
  const {
    splitMode,
    amount,
    currencyCode,
    memberUserIds,
    memberIds,
    policy,
    body,
  } = options;

  if (splitMode === "equal") {
    const parts = buildEqualExpenseSplits(
      amount,
      memberUserIds,
      currencyCode,
      policy,
    );
    return { ok: true, splitRows: splitPartsToInsertRows(parts) };
  }

  if (splitMode === "exact") {
    const rawManual = body.manual_splits;
    if (!Array.isArray(rawManual) || rawManual.length === 0) {
      return { ok: false, error: "manual_splits_required" };
    }
    const manualRows = rawManual.map((rawRow) => {
      const row = rawRow as { user_id?: unknown; amount?: unknown };
      return {
        user_id: String(row.user_id ?? ""),
        amount: Number(row.amount),
      };
    });
    const splitUserIds = manualRows.map((row) => row.user_id);
    if (!splitUsersAreSubsetOfMembers(splitUserIds, memberIds)) {
      return { ok: false, error: "split_user_not_member" };
    }
    for (const manualRow of manualRows) {
      if (!Number.isFinite(manualRow.amount) || manualRow.amount < 0) {
        return { ok: false, error: "invalid_split_amount" };
      }
    }
    const rawAmountByUserId: Record<string, number> = {};
    for (const userId of memberUserIds) {
      rawAmountByUserId[userId] = 0;
    }
    for (const manualRow of manualRows) {
      rawAmountByUserId[manualRow.user_id] = manualRow.amount;
    }
    const exactResult = finalizeExactAmountSplits(
      memberUserIds,
      rawAmountByUserId,
      amount,
      currencyCode,
      policy,
    );
    if (!exactResult.ok) {
      if (exactResult.error === "exact_adjust_over_negative") {
        return { ok: false, error: "exact_adjust_failed" };
      }
      return { ok: false, error: exactResult.error };
    }
    return {
      ok: true,
      splitRows: splitPartsToInsertRows(exactResult.parts),
    };
  }

  if (splitMode === "shares") {
    const rawShares = body.share_inputs;
    if (!Array.isArray(rawShares) || rawShares.length === 0) {
      return { ok: false, error: "share_inputs_required" };
    }
    const shareInputs: ShareSplitInput[] = rawShares.map((rawRow) => {
      const row = rawRow as { user_id?: unknown; weight?: unknown };
      return {
        userId: String(row.user_id ?? ""),
        weight: Number(row.weight),
      };
    });
    const shareResult = computeShareSplitParts(
      amount,
      memberUserIds,
      shareInputs,
      currencyCode,
      policy,
    );
    if (!shareResult.ok) {
      return { ok: false, error: shareResult.error };
    }
    return { ok: true, splitRows: splitPartsToInsertRows(shareResult.parts) };
  }

  if (splitMode === "percent") {
    const rawPercents = body.percent_inputs;
    if (!Array.isArray(rawPercents) || rawPercents.length === 0) {
      return { ok: false, error: "percent_inputs_required" };
    }
    const percentInputs: PercentSplitInput[] = rawPercents.map((rawRow) => {
      const row = rawRow as { user_id?: unknown; percent?: unknown };
      return {
        userId: String(row.user_id ?? ""),
        percent: Number(row.percent),
      };
    });
    const percentResult = computePercentSplitParts(
      amount,
      memberUserIds,
      percentInputs,
      currencyCode,
      policy,
    );
    if (!percentResult.ok) {
      return { ok: false, error: percentResult.error };
    }
    return { ok: true, splitRows: splitPartsToInsertRows(percentResult.parts) };
  }

  if (splitMode === "itemized") {
    const rawLines = body.itemized_lines;
    if (!Array.isArray(rawLines) || rawLines.length === 0) {
      return { ok: false, error: "itemized_lines_required" };
    }
    const itemizedLines: ItemizedLineInput[] = [];
    for (const rawRow of rawLines) {
      const row = rawRow as {
        amount?: unknown;
        participant_ids?: unknown;
      };
      const lineAmount = Number(row.amount);
      const participantIds = Array.isArray(row.participant_ids)
        ? row.participant_ids.map((value) => String(value))
        : [];
      if (!Number.isFinite(lineAmount) || lineAmount <= 0) {
        return { ok: false, error: "invalid_line_amount" };
      }
      itemizedLines.push({
        minorAmount: toMinorUnits(lineAmount, currencyCode),
        participantIds,
      });
    }
    const linePolicy: RemainderPolicy =
      policy.kind === "specific_user" || policy.kind === "payer"
        ? { kind: "first_in_member_list" }
        : policy;
    const itemizedResult = computeItemizedSplitParts(
      amount,
      memberUserIds,
      itemizedLines,
      currencyCode,
      linePolicy,
    );
    if (!itemizedResult.ok) {
      return { ok: false, error: itemizedResult.error };
    }
    return {
      ok: true,
      splitRows: splitPartsToInsertRows(itemizedResult.parts),
    };
  }

  return { ok: false, error: "invalid_split_mode" };
}
