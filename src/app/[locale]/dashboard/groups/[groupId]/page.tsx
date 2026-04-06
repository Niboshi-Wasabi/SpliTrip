/**
 * Authenticated group dashboard: expenses, settlements, invite, and split entry.
 */

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { localizedJoinPath } from "@/lib/i18n/localized-paths";
import { fetchGroupDetailForUser } from "@/lib/group-queries";
import { formatYen } from "@/lib/format";
import { GroupSettlementList } from "./group-settlement-list";
import { createClient } from "@/utils/supabase/server";
import { GroupExpensePanel } from "./group-expense-panel";
import { GroupNextPayerHint } from "./group-next-payer-hint";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GroupInviteButton } from "./group-invite-button";
import { GroupExportToolbar } from "./group-export-toolbar";
import {
  GroupExportCaptureArea,
  GroupExportCaptureProvider,
} from "./group-export-capture";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ locale: string; groupId: string }> };

export default async function GroupDetailPage({ params }: PageProps) {
  const { locale, groupId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/", locale });
    return;
  }

  console.log("[GroupDetail] user.id =", user.id, "groupId =", groupId);

  const result = await fetchGroupDetailForUser(supabase, groupId, user.id);

  if (!result.ok) {
    console.error("[GroupDetail] fetchGroupDetailForUser failed:", result.error, {
      groupId,
      userId: user.id,
      isAnonymous: user.is_anonymous,
    });
    if (result.error === "group_not_found") {
      notFound();
    }
    if (result.error === "forbidden") {
      notFound();
    }
    throw new Error(result.error);
  }

  const { group, members, expenses, settlements } = result.data;
  const invitePath = localizedJoinPath(locale, String(group.invite_token));
  const tExport = await getTranslations("GroupExport");
  const snapshotPrintedAt = new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-sm print:hidden">
        <div className="mx-auto flex max-w-6xl items-start gap-3 px-4 py-3">
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            ダッシュボード
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-foreground">{group.name}</h1>
            <p className="text-xs text-muted-foreground">
              {group.currency_code} · メンバー {members.length} 人
            </p>
            <div className="mt-3">
              <GroupInviteButton
                invitePath={invitePath}
                groupName={group.name}
              />
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <GroupExportCaptureProvider>
          <GroupExportToolbar
            groupName={group.name}
            currencyCode={group.currency_code}
            members={members.map((memberRow) => ({
              user_id: memberRow.user_id,
              display_name: memberRow.display_name,
            }))}
            expenses={expenses.map((expenseRow) => ({
              expense_date: expenseRow.expense_date,
              payer_id: expenseRow.payer_id,
              description: expenseRow.description,
              amount: Number(expenseRow.amount),
              expense_splits: (expenseRow.expense_splits ?? []).map(
                (splitRow) => ({
                  user_id: splitRow.user_id,
                  amount: Number(splitRow.amount),
                }),
              ),
            }))}
            settlements={settlements.map((settlementRow) => ({
              fromDisplayName: settlementRow.fromDisplayName,
              toDisplayName: settlementRow.toDisplayName,
              amount: settlementRow.amount,
            }))}
          />

          <div className="print:hidden">
            <GroupNextPayerHint
              expenses={expenses}
              members={members}
              currencyCode={group.currency_code}
            />
          </div>

          <div className="print:hidden">
            <GroupExpensePanel
              groupId={groupId}
              members={members}
              currencyCode={group.currency_code}
            />
          </div>

          <GroupExportCaptureArea>
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm print:hidden">
              <p className="text-lg font-semibold text-foreground">
                {group.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {tExport("printedAt")}: {snapshotPrintedAt}
              </p>
            </div>

            <Card>
          <CardHeader>
            <CardTitle>登録済みの出費</CardTitle>
            <CardDescription>按分込みの一覧</CardDescription>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                まだ出費がありません
              </p>
            ) : (
              <ul className="space-y-3">
                {expenses.map((ex) => {
                  const payer = members.find((m) => m.user_id === ex.payer_id);
                  return (
                    <li
                      key={ex.id}
                      className="rounded-lg border border-border bg-card p-3 text-sm text-card-foreground"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-medium">
                          {ex.description?.trim() || "（無題）"}
                        </span>
                        <span className="font-semibold">
                          {formatYen(Number(ex.amount))}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {ex.expense_date} · 支払:{" "}
                        {payer?.display_name ?? ex.payer_id}
                      </p>
                      <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                        {(ex.expense_splits ?? []).map((s) => {
                          const u = members.find((m) => m.user_id === s.user_id);
                          return (
                            <li key={s.user_id}>
                              {u?.display_name ?? s.user_id}:{" "}
                              {formatYen(Number(s.amount))}
                              {Number(s.ratio) > 0 && Number(s.ratio) !== 1 ? (
                                <span className="ml-1 opacity-70">
                                  (ratio {Number(s.ratio).toFixed(4)})
                                </span>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>精算プラン（Simplify Debts）</CardTitle>
            <CardDescription className="space-y-1">
              <span>
                最小送金回数になるよう債権・債務を相殺した結果です。
              </span>
              <span className="block print:hidden">
                <Link
                  href="/settings"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  設定
                </Link>
                から PayPal.me / Cash App を登録すると、あなたが支払う行に送金用リンクが表示されます。
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {settlements.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                精算の必要はありません
              </p>
            ) : (
              <GroupSettlementList
                settlements={settlements}
                currencyCode={group.currency_code}
                currentUserId={user.id}
                members={members}
              />
            )}
          </CardContent>
        </Card>
          </GroupExportCaptureArea>
        </GroupExportCaptureProvider>
      </main>
    </div>
  );
}
