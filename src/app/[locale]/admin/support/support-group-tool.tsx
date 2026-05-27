"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatYen } from "@/lib/format";

type Expense = {
  id: string;
  amount: number | string;
  description: string | null;
  category?: string | null;
  expense_date?: string | null;
  created_at: string;
  payer_id?: string | null;
};

export function SupportGroupTool() {
  const t = useTranslations("Admin");
  const [groupId, setGroupId] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [group, setGroup] = useState<{ name: string; currency_code: string } | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  async function run() {
    setBusy(true);
    setErrorMessage(null);
    setGroup(null);
    setExpenses([]);
    const id = groupId.trim();
    if (!id) {
      setErrorMessage(t("supportEmptyId"));
      setBusy(false);
      return;
    }
    try {
      const response = await fetch(
        `/api/admin/support/groups/${encodeURIComponent(id)}`,
        { cache: "no-store" },
      );
      const responseBody = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            group?: { name: string; currency_code: string };
            expenses?: Expense[];
            message?: string;
          }
        | null;
      if (response.status === 403) {
        setErrorMessage(t("stepUpRequiredError"));
        return;
      }
      if (!responseBody?.ok) {
        if (responseBody?.message === "group_not_found") {
          setErrorMessage(t("supportGroupNotFound"));
        } else {
          setErrorMessage(t("supportLoadError"));
        }
        return;
      }
      setGroup(responseBody.group ?? null);
      setExpenses(responseBody.expenses ?? []);
    } catch {
      setErrorMessage(t("supportLoadError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <p className="text-sm text-[var(--apple-text-secondary)]">{t("supportPageDescription")}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Label htmlFor="gid">{t("supportGroupIdLabel")}</Label>
          <Input
            id="gid"
            value={groupId}
            onChange={(event) => setGroupId(event.target.value)}
            placeholder="UUID"
            className="font-mono text-sm"
          />
        </div>
        <Button
          type="button"
          onClick={() => void run()}
          disabled={busy}
          className="min-h-[44px]"
        >
          {t("supportLoadButton")}
        </Button>
      </div>
      {errorMessage ? (
        <p className="text-sm text-red-500" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {group ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {t("supportGroupName")}: {group.name}
          </p>
          <p className="text-xs text-[var(--apple-text-secondary)]">
            {t("tableAccount")} / CCY: {group.currency_code}
          </p>
        </div>
      ) : null}
      {expenses.length > 0 ? (
        <div className="max-h-[min(50vh,480px)] overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("supportColDate")}</TableHead>
                <TableHead>{t("supportColAmount")}</TableHead>
                <TableHead>{t("supportColDesc")}</TableHead>
                <TableHead>{t("supportColPayer")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expenseItem) => (
                <TableRow key={expenseItem.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {expenseItem.expense_date ??
                      (expenseItem.created_at ? expenseItem.created_at.slice(0, 10) : "—")}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {formatYen(Number(expenseItem.amount) || 0)}
                  </TableCell>
                  <TableCell className="max-w-xs text-sm">
                    {expenseItem.description ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {expenseItem.payer_id ? `${expenseItem.payer_id.slice(0, 8)}…` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
