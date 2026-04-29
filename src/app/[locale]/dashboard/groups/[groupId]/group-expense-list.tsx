"use client";

/**
 * Responsive expense list with detail dialog (receipt + audit).
 * 出費一覧（詳細ダイアログで領収書・監査）。
 */

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { UserAvatar } from "@/components/user-avatar";
import { ExpenseCategoryIcon } from "@/components/expense-category-icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoneyByCurrency } from "@/lib/currency-payment-amount";
import { parseExpenseCategoryId } from "@/lib/expense-categories";
import { convertAmount } from "@/utils/exchangeRates";
import type { ExpenseRowDb, GroupMemberRow } from "@/lib/group-queries";
import { GroupExpenseDetailDialog } from "./group-expense-detail-dialog";
import { useLongPress } from "@/hooks/use-long-press";

type Props = {
  groupId: string;
  expenses: ExpenseRowDb[];
  members: GroupMemberRow[];
  currencyCode: string;
  exchangeRates: Record<string, number> | null;
};

type PreviewState = {
  expense: ExpenseRowDb;
  anchorLeft: number;
  anchorTop: number;
  isTouchMode: boolean;
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
  const [previewState, setPreviewState] = useState<PreviewState | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openDetail(expense: ExpenseRowDb): void {
    setSelectedExpense(expense);
    setDialogOpen(true);
  }

  function clearHoverTimer(): void {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }

  function openHoverPreview(
    expense: ExpenseRowDb,
    element: HTMLElement | null,
  ): void {
    if (!element) return;
    const rect = element.getBoundingClientRect();
    clearHoverTimer();
    hoverTimerRef.current = setTimeout(() => {
      setPreviewState({
        expense,
        anchorLeft: Math.min(rect.left + rect.width / 2, window.innerWidth - 24),
        anchorTop: Math.max(rect.top - 8, 32),
        isTouchMode: false,
      });
    }, 500);
  }

  function closeHoverPreview(): void {
    clearHoverTimer();
    setPreviewState((currentPreview) =>
      currentPreview?.isTouchMode ? currentPreview : null,
    );
  }

  const previewRows = useMemo(() => {
    if (!previewState) return [];
    return (previewState.expense.expense_splits ?? []).map((splitRow) => {
      const member = members.find((entry) => entry.user_id === splitRow.user_id);
      return {
        key: splitRow.user_id,
        displayName: member?.display_name ?? splitRow.user_id,
        avatarUrl: member?.avatar_url ?? null,
        amount: Number(splitRow.amount),
      };
    });
  }, [members, previewState]);

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
          const longPress = useLongPress({
            delayMs: 450,
            onLongPress: () => {
              setPreviewState({
                expense,
                anchorLeft: window.innerWidth / 2,
                anchorTop: window.innerHeight / 2,
                isTouchMode: true,
              });
            },
            onPressEnd: () => {
              setPreviewState((currentPreview) =>
                currentPreview?.isTouchMode ? null : currentPreview,
              );
            },
          });
          return (
            <li key={expense.id} className="list-none">
              <button
                type="button"
                className="w-full rounded-lg border border-border bg-card p-3 text-left text-sm text-card-foreground transition-colors hover:bg-muted/40"
                onClick={() => openDetail(expense)}
                {...longPress.bind}
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
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="px-3 py-2">{listTranslations("colCategory")}</TableHead>
                <TableHead className="px-3 py-2">{listTranslations("colDate")}</TableHead>
                <TableHead className="px-3 py-2">{listTranslations("colDescription")}</TableHead>
                <TableHead className="px-3 py-2">{listTranslations("colPayer")}</TableHead>
                <TableHead className="px-3 py-2 text-right">
                  {listTranslations("colAmount")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => {
                const payerMember = members.find(
                  (member) => member.user_id === expense.payer_id,
                );
                const categoryId = parseExpenseCategoryId(expense.category);
                return (
                  <TableRow
                    key={expense.id}
                    className="cursor-pointer transition-colors hover:bg-muted/30"
                    onClick={() => openDetail(expense)}
                    onMouseEnter={(event) =>
                      openHoverPreview(
                        expense,
                        event.currentTarget instanceof HTMLElement
                          ? event.currentTarget
                          : null,
                      )
                    }
                    onMouseLeave={closeHoverPreview}
                  >
                    <TableCell className="px-3 py-2.5">
                      <span
                        className="inline-flex items-center gap-1.5"
                        title={categoryTranslations(categoryId)}
                      >
                        <ExpenseCategoryIcon categoryId={categoryId} />
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                      {expense.expense_date}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 font-medium">
                      {expense.description?.trim() || listTranslations("untitled")}
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
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
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2.5 text-right font-semibold">
                      <AmountWithConversion
                        amount={Number(expense.amount)}
                        currencyCode={currencyCode}
                        exchangeRates={exchangeRates}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {previewState ? (
        <>
          {previewState.isTouchMode ? (
            <div className="pointer-events-none fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px] md:hidden" />
          ) : null}
          <div
            className={`pointer-events-none fixed z-50 w-[min(92vw,320px)] -translate-x-1/2 rounded-lg border border-zinc-700/60 bg-zinc-950/95 p-3 text-zinc-100 shadow-xl ${
              previewState.isTouchMode ? "-translate-y-1/2" : "-translate-y-full"
            }`}
            style={{
              left: previewState.anchorLeft,
              top: previewState.anchorTop,
            }}
            role="status"
            aria-live="polite"
          >
            <p className="mb-2 text-xs tracking-wide text-zinc-300">
              {listTranslations("previewTitle")}
            </p>
            <ul className="space-y-1.5">
              {previewRows.length === 0 ? (
                <li className="text-xs text-zinc-400">
                  {listTranslations("previewEmpty")}
                </li>
              ) : (
                previewRows.map((previewRow) => (
                  <li
                    key={previewRow.key}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <UserAvatar
                        displayName={previewRow.displayName}
                        avatarUrl={previewRow.avatarUrl}
                        size="sm"
                      />
                      <span className="truncate">{previewRow.displayName}</span>
                    </span>
                    <span className="shrink-0 font-semibold">
                      {formatMoneyByCurrency(currencyCode, previewRow.amount)}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      ) : null}

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
