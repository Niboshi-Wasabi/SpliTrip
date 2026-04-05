export const dynamic = "force-dynamic";

/**
 * Main dashboard: trip summary plus Warika group list / create entry point.
 */

import { Link } from "@/i18n/navigation";
import { Plane, Users, Receipt, TrendingUp, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchDashboardData } from "@/lib/dashboard-data";
import { formatYen } from "@/lib/format";
import { listGroupsForUser } from "@/lib/group-queries";
import { createClient } from "@/utils/supabase/server";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CategoryChart } from "./category-chart";
import { LogoutButton } from "./logout-button";

export default async function DashboardPage() {
  const {
    tripName,
    categories,
    members,
    settlements,
    totalExpense,
    perPerson,
    isGuestMode,
  } = await fetchDashboardData();

  const supabase = await createClient();
  const {
    data: { user: dashUser },
  } = await supabase.auth.getUser();

  const groupsResult =
    dashUser != null
      ? await listGroupsForUser(supabase, dashUser.id)
      : { ok: false as const, error: "no_user" };

  return (
    <div className="min-h-screen bg-background">
      {isGuestMode ? (
        <div
          role="status"
          className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm leading-snug text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-100"
        >
          ⚠️
          現在ゲストモードです。ブラウザの閉鎖やキャッシュクリアでデータが消える可能性があるため、正式なアカウント連携を推奨します
        </div>
      ) : null}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-600 p-1.5 text-white dark:bg-blue-500">
              <Plane className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">SpliTrip</h1>
              <p className="text-xs text-muted-foreground">{tripName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Link
              href="/settings"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-muted-foreground",
              )}
            >
              設定
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Card className="mb-6">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <UsersRound className="h-4 w-4" />
                割り勘グループ
              </CardTitle>
              <CardDescription>
                旅行ごとのグループで出費・按分・精算を管理します
              </CardDescription>
            </div>
            <Link
              href="/dashboard/groups/new"
              className={cn(buttonVariants())}
            >
              新しい旅行（グループ）を作成
            </Link>
          </CardHeader>
          <CardContent>
            {!groupsResult.ok ? (
              <p className="text-sm text-muted-foreground">
                {groupsResult.error === "no_user"
                  ? "ログイン後にグループ一覧が表示されます。"
                  : "グループ一覧を読み込めませんでした。"}
              </p>
            ) : groupsResult.items.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {groupsResult.items.map(({ group: g }) => (
                  <li key={g.id}>
                    <Link
                      href={`/dashboard/groups/${g.id}`}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {g.name}
                    </Link>
                    <span className="ml-2 text-muted-foreground">
                      {g.currency_code}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                まだグループがありません。「新しい旅行（グループ）を作成」から始められます。
              </p>
            )}
          </CardContent>
        </Card>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                総支出
              </CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatYen(totalExpense)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                メンバー数
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {members.length}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  人
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                一人あたり
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatYen(perPerson)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>カテゴリ別支出</CardTitle>
              <CardDescription>
                総支出 {formatYen(totalExpense)} の内訳
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CategoryChart data={categories} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>メンバー別 立替状況</CardTitle>
              <CardDescription>
                各メンバーの支払額と負担額
              </CardDescription>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  メンバーがいません
                </p>
              ) : (
                <div className="space-y-4">
                  {members.map((member) => {
                    const balance = member.paid - member.owed;
                    return (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 rounded-lg border p-3"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                          {member.avatar}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground">
                            支払済: {formatYen(member.paid)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-semibold ${balance > 0 ? "text-emerald-600 dark:text-emerald-400" : balance < 0 ? "text-red-500 dark:text-red-400" : "text-muted-foreground"}`}
                          >
                            {balance > 0 ? "+" : ""}
                            {formatYen(balance)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {balance > 0
                              ? "受け取り"
                              : balance < 0
                                ? "支払い"
                                : "精算済み"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>精算プラン</CardTitle>
              <CardDescription>
                最小送金回数で精算できるプランです
              </CardDescription>
            </CardHeader>
            <CardContent>
              {settlements.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  精算の必要はありません
                </p>
              ) : (
                <div className="space-y-3">
                  {settlements.map((settlement, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-600">
                          {settlement.from.charAt(0)}
                        </div>
                        <span className="font-medium">{settlement.from}</span>
                        <span className="text-muted-foreground">&rarr;</span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-600">
                          {settlement.to.charAt(0)}
                        </div>
                        <span className="font-medium">{settlement.to}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold">
                          {formatYen(settlement.amount)}
                        </span>
                        <Button size="sm" variant="outline">
                          送金する
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
