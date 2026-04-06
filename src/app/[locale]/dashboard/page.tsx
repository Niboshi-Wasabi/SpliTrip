export const dynamic = "force-dynamic";

/**
 * Main dashboard: group-based expense overview with per-group breakdown.
 */

import { Link } from "@/i18n/navigation";
import {
  Plane,
  Receipt,
  FolderOpen,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatYen } from "@/lib/format";
import { listGroupsForUser } from "@/lib/group-queries";
import { createClient } from "@/utils/supabase/server";
import {
  checkNeedsOnboarding,
  extractDisplayName,
  extractAvatarUrl,
} from "@/lib/user-profile";
import { redirect } from "@/i18n/navigation";
import { UserAvatar } from "@/components/user-avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CategoryChart } from "./category-chart";
import { LogoutButton } from "./logout-button";
import { getCategoryColor } from "@/lib/categories";

type PageProps = { params: Promise<{ locale: string }> };

export default async function DashboardPage({ params }: PageProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("unauthorized");
  }

  if (await checkNeedsOnboarding(supabase)) {
    redirect({ href: "/onboarding?next=/dashboard", locale });
    return;
  }

  const isGuestMode = user.is_anonymous === true;

  const { data: ownProfileRaw } = await supabase.rpc("get_own_profile");
  const ownProfile =
    typeof ownProfileRaw === "object" && ownProfileRaw !== null
      ? (ownProfileRaw as {
          display_name?: string;
          avatar_url?: string | null;
        })
      : null;
  const currentDisplayName =
    ownProfile?.display_name ?? extractDisplayName(user);
  const currentAvatarUrl =
    ownProfile?.avatar_url ?? extractAvatarUrl(user);

  const groupsResult = await listGroupsForUser(supabase, user.id);
  const groups = groupsResult.ok ? groupsResult.items : [];
  const groupIds = groups.map((groupItem) => groupItem.group.id);

  const expenseTotalByGroup = new Map<string, number>();
  const expenseDetailsByGroup = new Map<
    string,
    { description: string; amount: number }[]
  >();
  if (groupIds.length > 0) {
    const { data: expenseRows, error: expensesError } = await supabase
      .from("group_expenses")
      .select("group_id, amount, description")
      .in("group_id", groupIds);

    if (expensesError) {
      console.error(
        "dashboard group_expenses (non-fatal):",
        expensesError.message,
      );
    }

    for (const expense of expenseRows ?? []) {
      const expenseAmount = Number(expense.amount);
      expenseTotalByGroup.set(
        expense.group_id,
        (expenseTotalByGroup.get(expense.group_id) ?? 0) + expenseAmount,
      );
      const detailList = expenseDetailsByGroup.get(expense.group_id) ?? [];
      detailList.push({
        description: (expense.description as string)?.trim() || "",
        amount: expenseAmount,
      });
      expenseDetailsByGroup.set(expense.group_id, detailList);
    }
  }

  const totalExpense = [...expenseTotalByGroup.values()].reduce(
    (sum, value) => sum + value,
    0,
  );
  const groupCount = groups.length;
  const avgPerGroup =
    groupCount > 0 ? Math.round(totalExpense / groupCount) : 0;

  const chartData = groups
    .map((groupItem, groupIndex) => ({
      category: groupItem.group.name,
      amount: expenseTotalByGroup.get(groupItem.group.id) ?? 0,
      color: getCategoryColor(groupItem.group.name, groupIndex),
      details: expenseDetailsByGroup.get(groupItem.group.id) ?? [],
    }))
    .filter((entry) => entry.amount > 0)
    .sort((left, right) => right.amount - left.amount);

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
              <p className="text-xs text-muted-foreground">ダッシュボード</p>
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
            <UserAvatar
              displayName={currentDisplayName}
              avatarUrl={currentAvatarUrl}
              size="md"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
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
                グループ数
              </CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{groupCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                1グループあたり
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatYen(avgPerGroup)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>グループ別支出</CardTitle>
              <CardDescription>
                全グループ合計 {formatYen(totalExpense)} の内訳
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CategoryChart data={chartData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UsersRound className="h-4 w-4" />
                  割り勘グループ
                </CardTitle>
                <CardDescription>
                  旅行ごとのグループで出費・按分・精算を管理
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {groups.length > 0 ? (
                <ul className="space-y-2">
                  {groups.map((groupItem) => (
                    <li key={groupItem.group.id}>
                      <Link
                        href={`/dashboard/groups/${groupItem.group.id}`}
                        className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                      >
                        <div>
                          <span className="font-medium text-primary">
                            {groupItem.group.name}
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {groupItem.group.currency_code}
                          </span>
                        </div>
                        <span className="text-sm font-semibold">
                          {formatYen(
                            expenseTotalByGroup.get(groupItem.group.id) ?? 0,
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-sm text-muted-foreground">
                  まだグループがありません。下のボタンから作成できます。
                </p>
              )}
              <div className="mt-4">
                <Link
                  href="/dashboard/groups/new"
                  className={cn(buttonVariants(), "w-full")}
                >
                  新しい旅行（グループ）を作成
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
          利用規約
        </Link>
        <span className="mx-2">·</span>
        <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
          プライバシーポリシー
        </Link>
      </footer>
    </div>
  );
}
