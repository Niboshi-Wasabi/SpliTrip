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
  const [err, setErr] = useState<string | null>(null);
  const [group, setGroup] = useState<{ name: string; currency_code: string } | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  async function run() {
    setBusy(true);
    setErr(null);
    setGroup(null);
    setExpenses([]);
    const id = groupId.trim();
    if (!id) {
      setErr(t("supportEmptyId"));
      setBusy(false);
      return;
    }
    try {
      const res = await fetch(
        `/api/admin/support/groups/${encodeURIComponent(id)}`,
        { cache: "no-store" },
      );
      const j = (await res.json().catch(() => null)) as
        | {
            ok?: boolean;
            group?: { name: string; currency_code: string };
            expenses?: Expense[];
            message?: string;
          }
        | null;
      if (res.status === 403) {
        setErr(t("stepUpRequiredError"));
        return;
      }
      if (!j?.ok) {
        if (j?.message === "group_not_found") {
          setErr(t("supportGroupNotFound"));
        } else {
          setErr(t("supportLoadError"));
        }
        return;
      }
      setGroup(j.group ?? null);
      setExpenses(j.expenses ?? []);
    } catch {
      setErr(t("supportLoadError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <p className="text-sm text-muted-foreground">{t("supportPageDescription")}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Label htmlFor="gid">{t("supportGroupIdLabel")}</Label>
          <Input
            id="gid"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            placeholder="UUID"
            className="font-mono text-sm"
          />
        </div>
        <Button type="button" onClick={() => void run()} disabled={busy}>
          {t("supportLoadButton")}
        </Button>
      </div>
      {err ? (
        <p className="text-sm text-destructive" role="alert">
          {err}
        </p>
      ) : null}
      {group ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {t("supportGroupName")}: {group.name}
          </p>
          <p className="text-xs text-muted-foreground">
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
              {expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {e.expense_date ?? (e.created_at ? e.created_at.slice(0, 10) : "—")}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {formatYen(Number(e.amount) || 0)}
                  </TableCell>
                  <TableCell className="max-w-xs text-sm">
                    {e.description ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {e.payer_id ? `${e.payer_id.slice(0, 8)}…` : "—"}
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
