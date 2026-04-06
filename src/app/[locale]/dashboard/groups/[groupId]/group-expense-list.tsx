/**
 * Responsive expense list: cards on mobile, table on md+.
 * レスポンシブ出費一覧: モバイルはカード型、PC はテーブル型に切り替える。
 *
 * モバイルでは情報密度を抑えて縦スクロールしやすくし、
 * PC では一覧性の高いテーブルで全メンバーの按分を横に並べる。
 * Mobile: lower density, easy vertical scroll.
 * Desktop: high-density table with splits visible at a glance.
 */

import { UserAvatar } from "@/components/user-avatar";
import { formatMoneyByCurrency } from "@/lib/currency-payment-amount";
import { convertAmount } from "@/utils/exchangeRates";
import type { ExpenseRowDb, GroupMemberRow } from "@/lib/group-queries";

type Props = {
  expenses: ExpenseRowDb[];
  members: GroupMemberRow[];
  currencyCode: string;
  /** null when no conversion needed (base currency is JPY) */
  exchangeRates: Record<string, number> | null;
};

/**
 * 金額と、必要に応じて JPY 換算額を表示するヘルパー。
 * Renders the original amount and an optional JPY-converted value.
 */
function AmountWithConversion({
  amount,
  currencyCode,
  exchangeRates,
}: {
  amount: number;
  currencyCode: string;
  exchangeRates: Record<string, number> | null;
}) {
  const formatted = formatMoneyByCurrency(currencyCode, amount);

  if (!exchangeRates) {
    return <>{formatted}</>;
  }

  const jpyAmount = convertAmount(amount, currencyCode, "JPY", exchangeRates);
  if (jpyAmount === null) {
    return <>{formatted}</>;
  }

  return (
    <>
      {formatted}
      <span className="ml-1 text-[11px] text-muted-foreground">
        (≈ {formatMoneyByCurrency("JPY", Math.round(jpyAmount))})
      </span>
    </>
  );
}

export function GroupExpenseList({ expenses, members, currencyCode, exchangeRates }: Props) {
  if (expenses.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        まだ出費がありません
      </p>
    );
  }

  return (
    <>
      {/* ── Mobile: カード型 ── */}
      <ul className="space-y-3 md:hidden">
        {expenses.map((expense) => {
          const payerMember = members.find(
            (member) => member.user_id === expense.payer_id,
          );
          return (
            <li
              key={expense.id}
              className="rounded-lg border border-border bg-card p-3 text-sm text-card-foreground"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">
                  {expense.description?.trim() || "（無題）"}
                </span>
                <span className="font-semibold">
                  <AmountWithConversion
                    amount={Number(expense.amount)}
                    currencyCode={currencyCode}
                    exchangeRates={exchangeRates}
                  />
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <UserAvatar
                  displayName={payerMember?.display_name ?? "?"}
                  avatarUrl={payerMember?.avatar_url}
                  size="sm"
                />
                <span>
                  {expense.expense_date} · 支払:{" "}
                  {payerMember?.display_name ?? expense.payer_id}
                </span>
              </div>
              <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                {(expense.expense_splits ?? []).map((split) => {
                  const splitMember = members.find(
                    (member) => member.user_id === split.user_id,
                  );
                  return (
                    <li
                      key={split.user_id}
                      className="flex items-center gap-1.5"
                    >
                      <UserAvatar
                        displayName={splitMember?.display_name ?? "?"}
                        avatarUrl={splitMember?.avatar_url}
                        size="sm"
                      />
                      <span>
                        {splitMember?.display_name ?? split.user_id}:{" "}
                        {formatMoneyByCurrency(currencyCode, Number(split.amount))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>

      {/* ── Desktop: テーブル型 ── */}
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-xs font-medium text-muted-foreground">
              <tr>
                <th className="px-3 py-2">日付</th>
                <th className="px-3 py-2">内容</th>
                <th className="px-3 py-2">支払者</th>
                <th className="px-3 py-2 text-right">金額</th>
                <th className="px-3 py-2">按分</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {expenses.map((expense) => {
                const payerMember = members.find(
                  (member) => member.user_id === expense.payer_id,
                );
                return (
                  <tr
                    key={expense.id}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                      {expense.expense_date}
                    </td>
                    <td className="px-3 py-2.5 font-medium">
                      {expense.description?.trim() || "（無題）"}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <UserAvatar
                          displayName={payerMember?.display_name ?? "?"}
                          avatarUrl={payerMember?.avatar_url}
                          size="sm"
                        />
                        <span>
                          {payerMember?.display_name ?? expense.payer_id}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold">
                      <AmountWithConversion
                        amount={Number(expense.amount)}
                        currencyCode={currencyCode}
                        exchangeRates={exchangeRates}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {(expense.expense_splits ?? []).map((split) => {
                          const splitMember = members.find(
                            (member) => member.user_id === split.user_id,
                          );
                          return (
                            <span
                              key={split.user_id}
                              className="flex items-center gap-1"
                            >
                              <UserAvatar
                                displayName={splitMember?.display_name ?? "?"}
                                avatarUrl={splitMember?.avatar_url}
                                size="sm"
                              />
                              {splitMember?.display_name ?? split.user_id}:{" "}
                              {formatMoneyByCurrency(currencyCode, Number(split.amount))}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
