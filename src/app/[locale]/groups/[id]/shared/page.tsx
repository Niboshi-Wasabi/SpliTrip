import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { formatMoneyByCurrency } from "@/lib/currency-payment-amount";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { computeGroupSettlements, type ExpenseWithSplits } from "@/lib/group-ledger";

export const dynamic = "force-dynamic";

/**
 * Read-only group summary for share links (no login). Token must match `groups.public_share_token`.
 * 閲覧専用サマリー。`?t=` は DB の public_share_token と一致する必要あり。
 */

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ t?: string }>;
};

export default async function GroupSharedReadOnlyPage({
  params,
  searchParams,
}: PageProps) {
  const { locale, id: groupId } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const tokenRaw = typeof query.t === "string" ? query.t.trim() : "";
  if (!tokenRaw) {
    notFound();
  }
  const supabase = createServiceRoleClient();
  const groupResult = await supabase
    .from("groups")
    .select("id, name, currency_code, public_share_token, settlement_finalized_at")
    .eq("id", groupId)
    .maybeSingle();
  if (
    groupResult.error ||
    !groupResult.data ||
    groupResult.data.public_share_token !== tokenRaw ||
    !groupResult.data.settlement_finalized_at
  ) {
    notFound();
  }
  const membersResult = await supabase
    .from("group_members")
    .select("user_id, provisional_display_name")
    .eq("group_id", groupId);
  if (membersResult.error) {
    notFound();
  }
  const memberUserIds = (membersResult.data ?? []).map((memberRow) => memberRow.user_id);
  const profilesResult =
    memberUserIds.length > 0
      ? await supabase
          .from("user_profiles")
          .select("id, display_name")
          .in("id", memberUserIds)
      : { data: [], error: null };
  if (profilesResult.error) {
    notFound();
  }
  const displayNameByUserId: Record<string, string> = {};
  for (const memberRow of membersResult.data ?? []) {
    const profileRow = (profilesResult.data ?? []).find(
      (row) => row.id === memberRow.user_id,
    );
    const profileName =
      typeof profileRow?.display_name === "string" ? profileRow.display_name.trim() : "";
    const provisionalName =
      typeof memberRow.provisional_display_name === "string"
        ? memberRow.provisional_display_name.trim()
        : "";
    displayNameByUserId[memberRow.user_id] = profileName || provisionalName || "Member";
  }
  const expensesResult = await supabase
    .from("group_expenses")
    .select("payer_id, amount, expense_splits(user_id, amount)")
    .eq("group_id", groupId);
  if (expensesResult.error) {
    notFound();
  }
  const ledgerEntries: ExpenseWithSplits[] = (expensesResult.data ?? []).map(
    (expenseRow) => ({
      payer_id: expenseRow.payer_id,
      amount: Number(expenseRow.amount),
      splits: (expenseRow.expense_splits ?? []).map((splitRow) => ({
        user_id: splitRow.user_id,
        amount: Number(splitRow.amount),
      })),
    }),
  );
  const settlements = computeGroupSettlements(ledgerEntries, displayNameByUserId);
  const summary = {
    groupName: groupResult.data.name,
    currencyCode: groupResult.data.currency_code,
    finalizedAt: groupResult.data.settlement_finalized_at,
    settlements,
  };
  const sharedTranslations = await getTranslations("SharedGroup");
  const finalizedAtText = new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(summary.finalizedAt));

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-4">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--apple-text-secondary)]">
          {sharedTranslations("badge")}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{summary.groupName}</h1>
        <p className="text-sm text-[var(--apple-text-secondary)]">
          {sharedTranslations("settlementHint")}
        </p>
        <p className="text-sm tabular-nums text-[var(--apple-text)]">
          {sharedTranslations("currencyLabel")}: {summary.currencyCode}
        </p>
        <p className="text-sm text-[var(--apple-text-secondary)]">
          {sharedTranslations("finalizedAtLabel")}: {finalizedAtText}
        </p>
        {summary.settlements.length === 0 ? (
          <p className="rounded-xl border border-[var(--apple-separator)] p-4 text-sm">
            {sharedTranslations("settlementEmpty")}
          </p>
        ) : (
          <ul className="space-y-2">
            {summary.settlements.map((settlementRow, settlementIndex) => (
              <li
                key={`${settlementRow.fromDisplayName}-${settlementRow.toDisplayName}-${settlementIndex}`}
                className="flex items-center justify-between gap-2 rounded-xl border border-[var(--apple-separator)] p-3"
              >
                <span className="text-sm">
                  {settlementRow.fromDisplayName} → {settlementRow.toDisplayName}
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {formatMoneyByCurrency(summary.currencyCode, settlementRow.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
