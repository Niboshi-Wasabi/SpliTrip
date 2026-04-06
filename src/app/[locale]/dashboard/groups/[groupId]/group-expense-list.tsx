"use client";

/**
 * Responsive expense list with detail dialog (receipt + audit).
 * 出費一覧（詳細ダイアログで領収書・監査）。
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { UserAvatar } from "@/components/user-avatar";
import { ExpenseCategoryIcon } from "@/components/expense-category-icon";
import { formatMoneyByCurrency } from "@/lib/currency-payment-amount";
import { parseExpenseCategoryId } from "@/lib/expense-categories";
import { convertAmount } from "@/utils/exchangeRates";
import type { ExpenseRowDb, GroupMemberRow } from "@/lib/group-queries";
import { GroupExpenseDetailDialog } from "./group-expense-detail-dialog";

type Props = {
  groupId: string;
  expenses: ExpenseRowDb[];
  members: GroupMemberRow[];
  currencyCode: string;
  exchangeRates: Record<string, number> | null;
};

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

export function GroupExpenseList({
  groupId,
  expenses,
  members,
  currencyCode,
  exchangeRates,
}: Props) {
  const listTranslations = useTranslations("GroupExpenseList");
  const categoryTranslations = useTranslations("ExpenseCategory");

  const [selectedExpense, setSelectedExpense] = useState<ExpenseRowDb | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  function openDetail(expense: ExpenseRowDb): void {
    setSelectedExpense(expense);
    setDialogOpen(true);
  }

  if (expenses.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {listTranslations("empty")}
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-3 md:hidden">
        {expenses.map((expense) => {
          const payerMember = members.find(
            (member) => member.user_id === expense.payer_id,
          );
          const categoryId = parseExpenseCategoryId(expense.category);
          return (
            <li key={expense.id} className="list-none">
              <button
                type="button"
                className="w-full rounded-lg border border-border bg-card p-3 text-left text-sm text-card-foreground transition-colors hover:bg-muted/40"
                onClick={() => openDetail(expense)}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 font-medium">
                    <ExpenseCategoryIcon categoryId={categoryId} />
                    <span className="truncate">
                      {expense.description?.trim() ||
                        listTranslations("untitled")}
                    </span>
                  </span>
                  <span className="font-semibold">
                    <AmountWithConversion
                      amount={Number(expense.amount)}
                      currencyCode={currencyCode}
                      exchangeRates={exchangeRates}
                    />
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{categoryTranslations(categoryId)}</span>
                  <span>·</span>
                  <UserAvatar
                    displayName={payerMember?.display_name ?? "?"}
                    avatarUrl={payerMember?.avatar_url}
                    size="sm"
                  />
                  <span>
                    {expense.expense_date} · {payerMember?.display_name}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-xs font-medium text-muted-foreground">
              <tr>
                <th className="px-3 py-2">{listTranslations("colCategory")}</th>
                <th className="px-3 py-2">{listTranslations("colDate")}</th>
                <th className="px-3 py-2">{listTranslations("colDescription")}</th>
                <th className="px-3 py-2">{listTranslations("colPayer")}</th>
                <th className="px-3 py-2 text-right">
                  {listTranslations("colAmount")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {expenses.map((expense) => {
                const payerMember = members.find(
                  (member) => member.user_id === expense.payer_id,
                );
                const categoryId = parseExpenseCategoryId(expense.category);
                return (
                  <tr
                    key={expense.id}
                    className="cursor-pointer transition-colors hover:bg-muted/30"
                    onClick={() => openDetail(expense)}
                  >
                    <td className="px-3 py-2.5">
                      <span
                        className="inline-flex items-center gap-1.5"
                        title={categoryTranslations(categoryId)}
                      >
                        <ExpenseCategoryIcon categoryId={categoryId} />
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                      {expense.expense_date}
                    </td>
                    <td className="px-3 py-2.5 font-medium">
                      {expense.description?.trim() || listTranslations("untitled")}
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <GroupExpenseDetailDialog
        groupId={groupId}
        expense={selectedExpense}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        members={members}
        currencyCode={currencyCode}
        exchangeRates={exchangeRates}
      />
    </>
  );
}
