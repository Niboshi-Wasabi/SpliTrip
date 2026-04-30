"use client";

/**
 * Expense detail: receipt (signed URL), optional delete, audit timeline.
 * 出費詳細: 領収書（署名 URL）、削除、監査タイムライン。
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Trash2 } from "lucide-react";
import { ExpenseCategoryIcon } from "@/components/expense-category-icon";
import { broadcastGroupRefresh } from "@/lib/realtime-broadcast";
import { parseExpenseCategoryId } from "@/lib/expense-categories";
import { formatMoneyByCurrency } from "@/lib/currency-payment-amount";
import { convertAmount } from "@/utils/exchangeRates";
import type { ExpenseRowDb, GroupMemberRow } from "@/lib/group-queries";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGroupOptimisticMutations } from "@/hooks/use-group-optimistic-mutations";

type AuditItem = {
  id: string;
  actor_id: string | null;
  action: "insert" | "update" | "delete";
  payload: unknown;
  created_at: string;
};

type ExpenseCommentRow = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
};

type Props = {
  groupId: string;
  expense: ExpenseRowDb | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExpenseDeletedOptimistic?: (expense: ExpenseRowDb) => void;
  onExpenseDeleteRollback?: (expense: ExpenseRowDb) => void;
  members: GroupMemberRow[];
  currencyCode: string;
  exchangeRates: Record<string, number> | null;
};

type ItemizedLineView = {
  name: string | null;
  amount: number;
  participantIds: string[];
};

function parseItemizedLinesForView(raw: unknown): ItemizedLineView[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const parsedLines: ItemizedLineView[] = [];
  for (const lineValue of raw) {
    if (lineValue === null || typeof lineValue !== "object") {
      continue;
    }
    const lineRecord = lineValue as {
      name?: unknown;
      amount?: unknown;
      participant_ids?: unknown;
    };
    const amount = Number(lineRecord.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      continue;
    }
    const participantIds = Array.isArray(lineRecord.participant_ids)
      ? lineRecord.participant_ids.map((value) => String(value))
      : [];
    if (participantIds.length === 0) {
      continue;
    }
    const lineName =
      typeof lineRecord.name === "string" && lineRecord.name.trim().length > 0
        ? lineRecord.name.trim()
        : null;
    parsedLines.push({
      name: lineName,
      amount,
      participantIds,
    });
  }
  return parsedLines;
}

function actorLabel(
  actorId: string | null,
  members: GroupMemberRow[],
): string {
  if (!actorId) {
    return "—";
  }
  const found = members.find((memberRow) => memberRow.user_id === actorId);
  return found?.display_name ?? actorId;
}

function payloadSummary(action: string, payload: unknown): string {
  if (payload === null || typeof payload !== "object") {
    return "";
  }
  const recordPayload = payload as Record<string, unknown>;
  if (action === "insert" || action === "delete") {
    const row = recordPayload.row;
    if (row && typeof row === "object") {
      return JSON.stringify(row, null, 2);
    }
  }
  if (action === "update") {
    return JSON.stringify(
      {
        before: recordPayload.before,
        after: recordPayload.after,
      },
      null,
      2,
    );
  }
  return JSON.stringify(payload, null, 2);
}

export function GroupExpenseDetailDialog({
  groupId,
  expense,
  open,
  onOpenChange,
  onExpenseDeletedOptimistic,
  onExpenseDeleteRollback,
  members,
  currencyCode,
  exchangeRates,
}: Props) {
  const router = useRouter();
  const detailTranslations = useTranslations("ExpenseDetail");
  const categoryTranslations = useTranslations("ExpenseCategory");
  const commentTranslations = useTranslations("ExpenseComments");
  const { deleteExpenseOptimistically } = useGroupOptimisticMutations(groupId);

  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  const [receiptSrc, setReceiptSrc] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState(false);

  const [commentItems, setCommentItems] = useState<ExpenseCommentRow[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);

  const expenseCategory = parseExpenseCategoryId(expense?.category);
  const itemizedLines = parseItemizedLinesForView(expense?.itemized_lines);

  const loadComments = useCallback(async () => {
    if (!expense) {
      return;
    }
    setCommentsLoading(true);
    try {
      const response = await fetch(
        `/api/groups/${groupId}/expenses/${expense.id}/comments`,
      );
      const body: unknown = await response.json().catch(() => null);
      if (
        !response.ok ||
        typeof body !== "object" ||
        body === null ||
        !("comments" in body) ||
        !Array.isArray((body as { comments: unknown }).comments)
      ) {
        setCommentItems([]);
        return;
      }
      setCommentItems((body as { comments: ExpenseCommentRow[] }).comments);
    } catch {
      setCommentItems([]);
    } finally {
      setCommentsLoading(false);
    }
  }, [expense, groupId]);

  const loadAudit = useCallback(async () => {
    if (!expense) {
      return;
    }
    setAuditLoading(true);
    setAuditError(null);
    try {
      const response = await fetch(
        `/api/groups/${groupId}/expenses/${expense.id}/audit`,
      );
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setAuditError(detailTranslations("auditLoadError"));
        setAuditItems([]);
        return;
      }
      if (
        typeof body !== "object" ||
        body === null ||
        !("items" in body) ||
        !Array.isArray((body as { items: unknown }).items)
      ) {
        setAuditItems([]);
        return;
      }
      setAuditItems((body as { items: AuditItem[] }).items);
    } catch {
      setAuditError(detailTranslations("auditLoadError"));
      setAuditItems([]);
    } finally {
      setAuditLoading(false);
    }
  }, [expense, groupId, detailTranslations]);

  const loadReceipt = useCallback(async () => {
    if (!expense?.receipt_url) {
      setReceiptSrc(null);
      return;
    }
    setReceiptLoading(true);
    setReceiptError(null);
    try {
      const response = await fetch(
        `/api/groups/${groupId}/expenses/${expense.id}/receipt`,
      );
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setReceiptSrc(null);
        if (response.status === 404) {
          setReceiptError(null);
          return;
        }
        setReceiptError(detailTranslations("receiptLoadError"));
        return;
      }
      if (
        typeof body === "object" &&
        body !== null &&
        "signedUrl" in body &&
        typeof (body as { signedUrl: unknown }).signedUrl === "string"
      ) {
        setReceiptSrc((body as { signedUrl: string }).signedUrl);
      }
    } catch {
      setReceiptError(detailTranslations("receiptLoadError"));
      setReceiptSrc(null);
    } finally {
      setReceiptLoading(false);
    }
  }, [expense, groupId, detailTranslations]);

  useEffect(() => {
    if (!open || !expense) {
      return;
    }
    void loadAudit();
    void loadReceipt();
    void loadComments();
  }, [open, expense, loadAudit, loadReceipt, loadComments]);

  useEffect(() => {
    if (!open) {
      setReceiptSrc(null);
      setReceiptError(null);
      setAuditItems([]);
      setAuditError(null);
      setCommentItems([]);
      setCommentDraft("");
    }
  }, [open]);

  async function handleDelete(): Promise<void> {
    if (!expense) {
      return;
    }
    const confirmed = window.confirm(detailTranslations("deleteConfirm"));
    if (!confirmed) {
      return;
    }
    setDeleting(true);
    try {
      const deleteSucceeded = await deleteExpenseOptimistically({
        expenseId: expense.id,
        onOptimisticApplied: () => {
          onExpenseDeletedOptimistic?.(expense);
          onOpenChange(false);
        },
        onRollback: () => {
          onExpenseDeleteRollback?.(expense);
        },
      });
      if (!deleteSucceeded) {
        window.alert(detailTranslations("deleteFailed"));
        return;
      }
      broadcastGroupRefresh(groupId);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  async function handleSubmitComment(): Promise<void> {
    if (!expense || commentDraft.trim().length === 0) {
      return;
    }
    setCommentSaving(true);
    try {
      const response = await fetch(
        `/api/groups/${groupId}/expenses/${expense.id}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: commentDraft.trim() }),
        },
      );
      if (!response.ok) {
        window.alert(commentTranslations("postError"));
        return;
      }
      setCommentDraft("");
      await loadComments();
      broadcastGroupRefresh(groupId);
      router.refresh();
    } finally {
      setCommentSaving(false);
    }
  }

  if (!expense) {
    return null;
  }

  const payerMember = members.find(
    (memberRow) => memberRow.user_id === expense.payer_id,
  );
  const amountNumber = Number(expense.amount);
  const jpyEquivalent =
    exchangeRates !== null
      ? convertAmount(amountNumber, currencyCode, "JPY", exchangeRates)
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[min(90vh,720px)] w-full max-w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8 text-base">
            <ExpenseCategoryIcon categoryId={expenseCategory} />
            <span className="min-w-0 truncate">
              {expense.description?.trim() || detailTranslations("untitled")}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <span>{categoryTranslations(expenseCategory)}</span>
            <span>·</span>
            <span>{expense.expense_date}</span>
          </div>

          <div className="flex items-center gap-2">
            <UserAvatar
              displayName={payerMember?.display_name ?? "?"}
              avatarUrl={payerMember?.avatar_url}
              size="sm"
            />
            <span>
              {detailTranslations("payerLabel")}:{" "}
              {payerMember?.display_name ?? expense.payer_id}
            </span>
          </div>

          <p className="text-lg font-semibold tabular-nums">
            {formatMoneyByCurrency(currencyCode, amountNumber)}
            {jpyEquivalent !== null ? (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (≈ {formatMoneyByCurrency("JPY", Math.round(jpyEquivalent))})
              </span>
            ) : null}
          </p>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {detailTranslations("splitsHeading")}
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {(expense.expense_splits ?? []).map((splitRow) => {
                const splitMember = members.find(
                  (memberRow) => memberRow.user_id === splitRow.user_id,
                );
                return (
                  <li
                    key={splitRow.user_id}
                    className="flex items-center gap-1.5"
                  >
                    <UserAvatar
                      displayName={splitMember?.display_name ?? "?"}
                      avatarUrl={splitMember?.avatar_url}
                      size="sm"
                    />
                    <span>
                      {splitMember?.display_name ?? splitRow.user_id}:{" "}
                      {formatMoneyByCurrency(
                        currencyCode,
                        Number(splitRow.amount),
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {itemizedLines.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                {detailTranslations("itemizedHeading")}
              </p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {itemizedLines.map((lineEntry, index) => {
                  const participantNames = lineEntry.participantIds
                    .map((participantId) => actorLabel(participantId, members))
                    .join(", ");
                  return (
                    <li key={`${lineEntry.name ?? "line"}-${index}`}>
                      <span className="font-medium text-foreground">
                        {lineEntry.name ??
                          detailTranslations("itemizedUntitled", {
                            index: index + 1,
                          })}
                      </span>
                      {" · "}
                      {formatMoneyByCurrency(currencyCode, lineEntry.amount)}
                      {" · "}
                      {participantNames}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {expense.receipt_url ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {detailTranslations("receiptHeading")}
              </p>
              {receiptLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  <span>{detailTranslations("receiptLoading")}</span>
                </div>
              ) : null}
              {receiptError ? (
                <p className="text-xs text-destructive">{receiptError}</p>
              ) : null}
              {receiptSrc ? (
                // Signed Supabase URLs are per-request; static remotePatterns are impractical. / 署名URLは都度変わるため next/image の固定ドメイン指定が難しい
                // eslint-disable-next-line @next/next/no-img-element -- receipt preview uses short-lived signed URL / 短命の署名URLで領収書プレビュー
                <img
                  src={receiptSrc}
                  alt=""
                  className="max-h-64 w-full rounded-md border object-contain"
                />
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 border-t pt-3">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="min-h-[44px] gap-1.5 md:min-h-9"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden />
              )}
              {detailTranslations("deleteExpense")}
            </Button>
          </div>

          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground">
              {commentTranslations("heading")}
            </p>
            {commentsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                <span>{commentTranslations("loading")}</span>
              </div>
            ) : null}
            <ul className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-border bg-muted/20 p-2 text-sm">
              {commentItems.map((commentRow) => (
                <li key={commentRow.id} className="rounded bg-background/80 p-2">
                  <p className="text-xs text-muted-foreground">
                    {actorLabel(commentRow.author_id, members)} ·{" "}
                    {new Date(commentRow.created_at).toLocaleString()}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{commentRow.body}</p>
                </li>
              ))}
            </ul>
            <textarea
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              placeholder={commentTranslations("placeholder")}
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[88px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              maxLength={2000}
            />
            <Button
              type="button"
              size="sm"
              className="min-h-[44px] w-full sm:w-auto"
              disabled={commentSaving || commentDraft.trim().length === 0}
              onClick={() => void handleSubmitComment()}
            >
              {commentSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  {commentTranslations("saving")}
                </>
              ) : (
                commentTranslations("submit")
              )}
            </Button>
          </div>

          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground">
              {detailTranslations("auditHeading")}
            </p>
            {auditLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                <span>{detailTranslations("auditLoading")}</span>
              </div>
            ) : null}
            {auditError ? (
              <p className="text-xs text-destructive">{auditError}</p>
            ) : null}
            {!auditLoading && auditItems.length === 0 && !auditError ? (
              <p className="text-xs text-muted-foreground">
                {detailTranslations("auditEmpty")}
              </p>
            ) : null}
            <ul className="space-y-3">
              {auditItems.map((entry) => {
                const whenReadable = new Date(entry.created_at).toLocaleString();
                return (
                  <li
                    key={entry.id}
                    className="rounded-md border border-border bg-muted/30 p-2 text-xs"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium">
                        {detailTranslations(
                          entry.action === "insert"
                            ? "auditAction.insert"
                            : entry.action === "update"
                              ? "auditAction.update"
                              : "auditAction.delete",
                        )}
                      </span>
                      <span className="text-muted-foreground">{whenReadable}</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {detailTranslations("auditActor")}:{" "}
                      {actorLabel(entry.actor_id, members)}
                    </p>
                    <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-background p-2 text-[10px] leading-snug text-foreground">
                      {payloadSummary(entry.action, entry.payload)}
                    </pre>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
