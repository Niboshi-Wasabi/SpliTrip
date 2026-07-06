/**
 * Persist FX reference snapshot on newly created expenses (non-JPY groups).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { convertAmount, fetchExchangeRates } from "@/utils/exchangeRates";

const REFERENCE_CURRENCY_CODE = "JPY";

export async function persistExpenseExchangeSnapshot(params: {
  supabase: SupabaseClient;
  expenseId: string;
  groupId: string;
  groupCurrencyCode: string;
  amount: number;
}): Promise<void> {
  const groupCurrency = params.groupCurrencyCode.trim().toUpperCase();
  if (groupCurrency === REFERENCE_CURRENCY_CODE) {
    return;
  }

  const rateResult = await fetchExchangeRates(groupCurrency);
  if (!rateResult.ok) {
    return;
  }

  const convertedAmount = convertAmount(
    params.amount,
    groupCurrency,
    REFERENCE_CURRENCY_CODE,
    rateResult.rates,
  );
  if (convertedAmount === null) {
    return;
  }

  const quoteRate = rateResult.rates[REFERENCE_CURRENCY_CODE];
  if (typeof quoteRate !== "number" || quoteRate <= 0) {
    return;
  }

  const { error } = await params.supabase
    .from("group_expenses")
    .update({
      reference_currency_code: REFERENCE_CURRENCY_CODE,
      reference_exchange_rate: quoteRate,
      reference_converted_amount: Math.round(convertedAmount),
    })
    .eq("id", params.expenseId)
    .eq("group_id", params.groupId);

  if (error) {
    const message = String(error.message ?? "").toLowerCase();
    if (!message.includes("reference_")) {
      console.error(
        "[API/Action Error - persistExpenseExchangeSnapshot]:",
        error,
      );
    }
  }
}
