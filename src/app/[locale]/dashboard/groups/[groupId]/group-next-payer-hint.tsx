/**
 * Small RSC widget: recommends the member with the lowest net balance (largest debt)
 * as the next person to pay at the register.
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMoneyByCurrency } from "@/lib/currency-payment-amount";
import {
  computeNetBalances,
  type ExpenseWithSplits,
} from "@/lib/group-ledger";
import { suggestNextPayer } from "@/utils/settlement";

type Member = { user_id: string; display_name: string };

type ExpenseRow = {
  payer_id: string;
  amount: string | number;
  expense_splits: { user_id: string; amount: string | number }[] | null;
};

const NET_EPS = 0.005;

export function GroupNextPayerHint({
  expenses,
  members,
  currencyCode,
}: {
  expenses: ExpenseRow[];
  members: Member[];
  currencyCode: string;
}) {
  const ledgerEntries: ExpenseWithSplits[] = expenses.map((expenseRow) => ({
    payer_id: expenseRow.payer_id,
    amount: Number(expenseRow.amount),
    splits: (expenseRow.expense_splits ?? []).map((splitRow) => ({
      user_id: splitRow.user_id,
      amount: Number(splitRow.amount),
    })),
  }));

  const netBalanceByUserId = computeNetBalances(ledgerEntries);
  const memberUserIds = members.map((memberRow) => memberRow.user_id);
  const nextPayerSuggestion =
    memberUserIds.length > 0
      ? suggestNextPayer(netBalanceByUserId, memberUserIds)
      : null;

  const lowestNetAmongMembers =
    memberUserIds.length > 0
      ? Math.min(
          ...memberUserIds.map(
            (userId) => netBalanceByUserId[userId] ?? 0,
          ),
        )
      : 0;

  const showDebtHint =
    nextPayerSuggestion !== null && lowestNetAmongMembers < -NET_EPS;
  const suggestedDisplayName =
    nextPayerSuggestion !== null
      ? (members.find(
          (memberRow) => memberRow.user_id === nextPayerSuggestion.userId,
        )?.display_name ?? "メンバー")
      : "";

  return (
    <Card className="border-dashed border-blue-200 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/20">
      <CardHeader className="py-3">
        <CardTitle className="text-sm">次は誰が払う？</CardTitle>
        <CardDescription className="text-xs">
          登録済みの出費から見た正味残高（支払い − 負担）に基づく目安です。
        </CardDescription>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        {memberUserIds.length === 0 ? (
          <p>メンバーがいません。</p>
        ) : showDebtHint && nextPayerSuggestion ? (
          <>
            <p className="text-sm font-semibold text-foreground">
              {suggestedDisplayName}
            </p>
            <p className="mt-1 leading-relaxed">
              グループへの債務が最も大きいメンバーです。次の支払いを担当すると、後の精算で送金が減りやすくなることがあります。
            </p>
            <p className="mt-2 font-mono text-[0.7rem] tabular-nums text-foreground">
              正味残高:{" "}
              {formatMoneyByCurrency(
                currencyCode,
                nextPayerSuggestion.netBalance,
              )}
            </p>
          </>
        ) : (
          <p className="leading-relaxed">
            大きな債務の偏りは見当たりません。次の支払いは誰でも大きくは変わりません。
          </p>
        )}
      </CardContent>
    </Card>
  );
}
