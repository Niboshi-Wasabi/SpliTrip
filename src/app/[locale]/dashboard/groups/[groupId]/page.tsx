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
import { formatMoneyByCurrency } from "@/lib/currency-payment-amount";
import { getCategoryColor, getExpenseCategoryChartColor } from "@/lib/categories";
import {
  EXPENSE_CATEGORY_IDS,
  parseExpenseCategoryId,
} from "@/lib/expense-categories";
import { GroupSpendingChartCard } from "./group-spending-chart-card";
import { GroupSettlementList } from "./group-settlement-list";
import { createClient } from "@/utils/supabase/server";
import { GroupExpensePanel } from "./group-expense-panel";
import { GroupNextPayerHint } from "./group-next-payer-hint";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GroupInviteButton } from "./group-invite-button";
import { GroupExportToolbar } from "./group-export-toolbar";
import { GroupPremiumShell } from "@/components/premium/group-premium-shell";
import { remainingFreeOcrUses } from "@/lib/premium-access";
import { DisplayNamePrompt } from "@/components/display-name-prompt";
import { RealtimeGroupSync } from "@/components/realtime-group-sync";
import { UserAvatar } from "@/components/user-avatar";
import {
  checkNeedsOnboarding,
  getMandatoryPitchHref,
} from "@/lib/user-profile";
import { GroupExpenseList } from "./group-expense-list";
import { fetchExchangeRates } from "@/utils/exchangeRates";
import { PromoBanner } from "@/components/ads/PromoBanner";

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

  const pitchHref = await getMandatoryPitchHref(
    supabase,
    `/dashboard/groups/${groupId}`,
  );
  if (pitchHref) {
    redirect({ href: pitchHref, locale });
    return;
  }

  if (await checkNeedsOnboarding(supabase)) {
    redirect({
      href: `/onboarding?next=/dashboard/groups/${groupId}`,
      locale,
    });
    return;
  }

  const result = await fetchGroupDetailForUser(supabase, groupId, user.id);

  if (!result.ok) {
    console.error("[GroupDetail] fetchGroupDetailForUser failed:", result.error, {
      groupId,
      userId: user.id,
      isAnonymous: user.is_anonymous,
    });
    notFound();
  }

  const { group, members, expenses, settlements } = result.data;
  const currentMember = members.find(
    (member) => member.user_id === user.id,
  );
  const currentDisplayName = currentMember?.display_name ?? "ユーザー";
  const totalGroupExpense = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0,
  );
  const groupDetailTranslations = await getTranslations("GroupDetail");
  const payerChartData = (() => {
    const payerTotals = new Map<string, number>();
    const payerDetails = new Map<
      string,
      { description: string; amount: number }[]
    >();
    for (const expense of expenses) {
      const payerName =
        members.find((member) => member.user_id === expense.payer_id)
          ?.display_name ?? groupDetailTranslations("chartUnknownPayer");
      const expenseAmount = Number(expense.amount);
      payerTotals.set(
        payerName,
        (payerTotals.get(payerName) ?? 0) + expenseAmount,
      );
      const detailList = payerDetails.get(payerName) ?? [];
      detailList.push({
        description: expense.description?.trim() || "",
        amount: expenseAmount,
      });
      payerDetails.set(payerName, detailList);
    }
    return [...payerTotals.entries()]
      .sort(
        ([, amountLeft], [, amountRight]) => amountRight - amountLeft,
      )
      .map(([payerName, payerAmount], colorIndex) => ({
        category: payerName,
        amount: payerAmount,
        color: getCategoryColor(payerName, colorIndex),
        details: payerDetails.get(payerName) ?? [],
      }));
  })();

  const categoryChartData = (() => {
    const categoryTotals = new Map<string, number>();
    const categoryDetails = new Map<
      string,
      { description: string; amount: number }[]
    >();
    for (const expense of expenses) {
      const categoryId = parseExpenseCategoryId(expense.category);
      const expenseAmount = Number(expense.amount);
      categoryTotals.set(
        categoryId,
        (categoryTotals.get(categoryId) ?? 0) + expenseAmount,
      );
      const detailList = categoryDetails.get(categoryId) ?? [];
      detailList.push({
        description: expense.description?.trim() || "",
        amount: expenseAmount,
      });
      categoryDetails.set(categoryId, detailList);
    }
    return EXPENSE_CATEGORY_IDS.map((categoryId) => {
      const categoryAmount = categoryTotals.get(categoryId) ?? 0;
      if (categoryAmount <= 0) {
        return null;
      }
      return {
        category: categoryId,
        amount: categoryAmount,
        color: getExpenseCategoryChartColor(categoryId),
        details: categoryDetails.get(categoryId) ?? [],
      };
    })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .sort((left, right) => right.amount - left.amount);
  })();

  /**
   * グループの基準通貨が JPY 以外なら、JPY への換算レートを取得する。
   * 基準通貨が JPY なら換算不要のため null。
   * Fetch JPY conversion rates only when the group's base currency is not JPY.
   */
  const baseCurrency = group.currency_code.trim().toUpperCase();
  const needsConversion = baseCurrency !== "JPY";
  const exchangeRates: Record<string, number> | null = await (async () => {
    if (!needsConversion) return null;
    const result = await fetchExchangeRates(baseCurrency);
    return result.ok ? result.rates : null;
  })();

  const invitePath = localizedJoinPath(locale, String(group.invite_token));
  const exportTranslations = await getTranslations("GroupExport");
  const groupChartTranslations = await getTranslations("GroupCharts");
  const snapshotPrintedAt = new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());

  const { data: ownProfileJson } = await supabase.rpc("get_own_profile");
  const profileRecord =
    ownProfileJson && typeof ownProfileJson === "object"
      ? (ownProfileJson as Record<string, unknown>)
      : null;
  const hasPremiumAccess = profileRecord?.premium_access === true;
  const ocrUsageCount =
    typeof profileRecord?.ocr_usage_count === "number"
      ? profileRecord.ocr_usage_count
      : 0;
  const freeOcrRemaining = remainingFreeOcrUses({
    premium_access: hasPremiumAccess,
    ocr_usage_count: ocrUsageCount,
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-sm print:hidden">
        <div className="mx-auto flex max-w-6xl items-start gap-3 px-4 py-3">
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "min-h-[44px] md:min-h-0")}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {groupDetailTranslations("backDashboard")}
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-foreground">{group.name}</h1>
            <p className="text-xs text-muted-foreground">
              {groupDetailTranslations("memberLine", {
                currency: group.currency_code,
                count: members.length,
              })}
            </p>
            <div className="mt-1.5 flex -space-x-1.5">
              {members.map((memberRow) => (
                <UserAvatar
                  key={memberRow.user_id}
                  displayName={memberRow.display_name}
                  avatarUrl={memberRow.avatar_url}
                  size="sm"
                  className="ring-2 ring-card"
                />
              ))}
            </div>
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

      <RealtimeGroupSync groupId={groupId} currentUserId={user.id} />

      {/* pb-24: モバイルのボトムナビ分のクリアランス / Bottom nav clearance on mobile */}
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 pb-24 md:pb-6">
        <div className="print:hidden">
          <DisplayNamePrompt currentName={currentDisplayName} groupId={groupId} />
        </div>
        <GroupPremiumShell
          hasPremiumAccess={hasPremiumAccess}
          freeOcrRemaining={freeOcrRemaining}
        >
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
              category: parseExpenseCategoryId(expenseRow.category),
              expense_splits: (expenseRow.expense_splits ?? []).map(
                (splitRow) => ({
                  user_id: splitRow.user_id,
                  amount: Number(splitRow.amount),
                }),
              ),
            }))}
            totalExpenseAmount={totalGroupExpense}
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

          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm print:hidden">
              <p className="text-lg font-semibold text-foreground">
                {group.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {exportTranslations("printedAt")}: {snapshotPrintedAt}
              </p>
            </div>

            {payerChartData.length > 0 || categoryChartData.length > 0 ? (
              <GroupSpendingChartCard
                payerChartData={payerChartData}
                categoryChartData={categoryChartData}
                totalLabel={formatMoneyByCurrency(
                  baseCurrency,
                  totalGroupExpense,
                )}
                titlePayer={groupChartTranslations("groupTitlePayer")}
                titleCategory={groupChartTranslations("groupTitleCategory")}
              />
            ) : null}

            <Card>
          <CardHeader>
            <CardTitle>{groupDetailTranslations("expensesCardTitle")}</CardTitle>
            <CardDescription>
              {groupDetailTranslations("expensesCardDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GroupExpenseList
              groupId={groupId}
              expenses={expenses}
              members={members}
              currencyCode={baseCurrency}
              exchangeRates={exchangeRates}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {groupDetailTranslations("settlementCardTitle")}
            </CardTitle>
            <CardDescription className="space-y-1">
              <span>
                {groupDetailTranslations("settlementCardDescription")}
              </span>
              <span className="block print:hidden">
                <Link
                  href="/settings"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {groupDetailTranslations("settlementSettingsLink")}
                </Link>
                {groupDetailTranslations("settlementSettingsTrail")}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {settlements.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {groupDetailTranslations("settlementEmpty")}
              </p>
            ) : (
              <GroupSettlementList
                settlements={settlements}
                currencyCode={group.currency_code}
                currentUserId={user.id}
                members={members}
                exchangeRates={exchangeRates}
              />
            )}
            <div className="mt-4 print:hidden">
              <PromoBanner hidden={hasPremiumAccess} />
            </div>
          </CardContent>
        </Card>
          </div>
        </GroupPremiumShell>
      </main>
    </div>
  );
}
