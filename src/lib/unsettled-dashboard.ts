/**
 * Cross-group unsettled owed totals for dashboard stats.
 * ダッシュボード用の横断未精算額集計。
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeGroupSettlements,
  type ExpenseWithSplits,
} from "@/lib/group-ledger";
import {
  applyPaidStatusToSettlements,
  sumUnsettledOwedByUser,
  type SettlementTransactionRow,
} from "@/lib/settlement-transactions";
import { fetchExchangeRates, convertAmount } from "@/utils/exchangeRates";

type GroupExpenseRow = {
  group_id: string;
  payer_id: string;
  amount: string | number;
  expense_splits: { user_id: string; amount: string | number }[] | null;
};

export type UnsettledDashboardSummary = {
  /** JPY estimate of total owed (native JPY groups + converted foreign). */
  unsettledAmountJpyEstimate: number;
  /** Owed amounts grouped by group currency (unpaid debtor lines only). */
  unsettledOwedByCurrency: Record<string, number>;
};

function expenseRowToLedgerEntry(row: GroupExpenseRow): ExpenseWithSplits {
  return {
    payer_id: row.payer_id,
    amount: Number(row.amount),
    splits: (row.expense_splits ?? []).map((splitRow) => ({
      user_id: splitRow.user_id,
      amount: Number(splitRow.amount),
    })),
  };
}

/**
 * Computes how much the user still owes across all joined groups.
 */
export async function computeUnsettledDashboardSummary(
  supabase: SupabaseClient,
  userId: string,
  groupIds: string[],
  currencyByGroupId: Map<string, string>,
): Promise<UnsettledDashboardSummary> {
  if (groupIds.length === 0) {
    return { unsettledAmountJpyEstimate: 0, unsettledOwedByCurrency: {} };
  }

  const [expensesResult, paidResult, profilesResult] = await Promise.all([
    supabase
      .from("group_expenses")
      .select(
        `
        group_id,
        payer_id,
        amount,
        expense_splits ( user_id, amount )
      `,
      )
      .in("group_id", groupIds),
    supabase
      .from("settlement_transactions")
      .select(
        "group_id, from_user_id, to_user_id, amount, currency_code, marked_at, status",
      )
      .in("group_id", groupIds)
      .eq("status", "paid"),
    supabase.from("user_profiles").select("id, display_name"),
  ]);

  if (expensesResult.error) {
    console.error(
      "[API Error - computeUnsettledDashboardSummary expenses]:",
      expensesResult.error,
    );
    return { unsettledAmountJpyEstimate: 0, unsettledOwedByCurrency: {} };
  }

  if (paidResult.error) {
    // Table may not exist on older DB — degrade gracefully.
    const message = String(paidResult.error.message ?? "").toLowerCase();
    if (!message.includes("settlement_transactions")) {
      console.error(
        "[API Error - computeUnsettledDashboardSummary paid]:",
        paidResult.error,
      );
    }
  }

  const displayNameByUserId: Record<string, string> = {};
  for (const profileRow of profilesResult.data ?? []) {
    displayNameByUserId[profileRow.id] =
      profileRow.display_name?.trim() || "ユーザー";
  }

  const paidByGroupId = new Map<string, SettlementTransactionRow[]>();
  for (const paidRow of paidResult.data ?? []) {
    const groupId = paidRow.group_id as string;
    const bucket = paidByGroupId.get(groupId) ?? [];
    bucket.push(paidRow as SettlementTransactionRow);
    paidByGroupId.set(groupId, bucket);
  }

  const expensesByGroupId = new Map<string, GroupExpenseRow[]>();
  for (const expenseRow of (expensesResult.data ?? []) as GroupExpenseRow[]) {
    const groupId = expenseRow.group_id;
    const bucket = expensesByGroupId.get(groupId) ?? [];
    bucket.push(expenseRow);
    expensesByGroupId.set(groupId, bucket);
  }

  const unsettledOwedByCurrency: Record<string, number> = {};
  let unsettledAmountJpyEstimate = 0;
  const rateCache = new Map<string, Record<string, number>>();

  for (const groupId of groupIds) {
    const currencyCode =
      currencyByGroupId.get(groupId)?.trim().toUpperCase() ?? "JPY";
    const ledgerEntries = (expensesByGroupId.get(groupId) ?? []).map(
      expenseRowToLedgerEntry,
    );
    const rawSettlements = computeGroupSettlements(
      ledgerEntries,
      displayNameByUserId,
    );
    const settlements = applyPaidStatusToSettlements(
      rawSettlements.map((row) => ({ ...row, isMarkedPaid: false, markedPaidAt: null })),
      paidByGroupId.get(groupId) ?? [],
    );
    const owedInGroup = sumUnsettledOwedByUser(settlements, userId);
    if (owedInGroup <= 0) {
      continue;
    }

    unsettledOwedByCurrency[currencyCode] =
      (unsettledOwedByCurrency[currencyCode] ?? 0) + owedInGroup;

    if (currencyCode === "JPY") {
      unsettledAmountJpyEstimate += owedInGroup;
      continue;
    }

    let rates = rateCache.get(currencyCode);
    if (!rates) {
      const rateResult = await fetchExchangeRates(currencyCode);
      if (!rateResult.ok) {
        continue;
      }
      rates = rateResult.rates;
      rateCache.set(currencyCode, rates);
    }

    const jpyAmount = convertAmount(owedInGroup, currencyCode, "JPY", rates);
    if (jpyAmount !== null) {
      unsettledAmountJpyEstimate += Math.round(jpyAmount);
    }
  }

  return { unsettledAmountJpyEstimate, unsettledOwedByCurrency };
}
