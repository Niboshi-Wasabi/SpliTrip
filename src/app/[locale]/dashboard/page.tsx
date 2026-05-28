export const dynamic = "force-dynamic";

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatYen } from "@/lib/format";
import { listGroupsForUser } from "@/lib/group-queries";
import { createClient } from "@/utils/supabase/server";
import {
  checkNeedsOnboarding,
  getMandatoryPitchHref,
} from "@/lib/user-profile";
import { redirect } from "@/i18n/navigation";
import { DashboardSpendingChart } from "./dashboard-spending-chart";
import { DashboardStatsGrid } from "./dashboard-stats-grid";
import { DashboardGroupsList } from "./dashboard-groups-list";
import { BETA_FEEDBACK_HREF } from "@/lib/beta-feedback-href";
import { getCategoryColor, getExpenseCategoryChartColor } from "@/lib/categories";
import {
  EXPENSE_CATEGORY_IDS,
  parseExpenseCategoryId,
} from "@/lib/expense-categories";
import { PageHeader } from "@/components/app/page-header";

type PageProps = { params: Promise<{ locale: string }> };

export default async function DashboardPage({ params }: PageProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect({ href: "/", locale });
    throw new Error("unreachable");
  }

  const user = authUser;

  const pitchHref = await getMandatoryPitchHref(supabase, "/dashboard");
  if (pitchHref) {
    redirect({ href: pitchHref, locale });
    return;
  }

  if (await checkNeedsOnboarding(supabase)) {
    redirect({ href: "/onboarding?next=/dashboard", locale });
    return;
  }

  const ownProfileResponse = await supabase.rpc("get_own_profile");
  const ownProfile =
    typeof ownProfileResponse.data === "object" && ownProfileResponse.data !== null
      ? (ownProfileResponse.data as {
          premium_access?: boolean;
        })
      : null;
  const dashboardHasPremium = ownProfile?.premium_access === true;

  const groupsResult = await listGroupsForUser(supabase, user.id);
  const groups = groupsResult.ok ? groupsResult.items : [];
  const groupIds = groups.map((groupItem) => groupItem.group.id);

  const expenseTotalByGroup = new Map<string, number>();
  const expenseDetailsByGroup = new Map<
    string,
    { description: string; amount: number }[]
  >();

  type DashboardExpenseRow = {
    group_id: string;
    amount: unknown;
    description: unknown;
    category?: unknown;
  };

  let dashboardExpenseRows: DashboardExpenseRow[] = [];

  if (groupIds.length > 0) {
    const { data: expenseRowsRaw, error: expensesError } = await supabase
      .from("group_expenses")
      .select("group_id, amount, description, category")
      .in("group_id", groupIds);

    if (expensesError) {
      console.error(
        "[API/Action Error - dashboard group_expenses (non-fatal)]:",
        expensesError,
      );
    }

    dashboardExpenseRows = (expenseRowsRaw ?? []) as DashboardExpenseRow[];

    for (const expense of dashboardExpenseRows) {
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

  const chartDataByGroup = groups
    .map((groupItem, groupIndex) => ({
      category: groupItem.group.name,
      amount: expenseTotalByGroup.get(groupItem.group.id) ?? 0,
      color: getCategoryColor(groupItem.group.name, groupIndex),
      details: expenseDetailsByGroup.get(groupItem.group.id) ?? [],
    }))
    .filter((entry) => entry.amount > 0)
    .sort((left, right) => right.amount - left.amount);

  const groupNameById = new Map(
    groups.map((groupItem) => [groupItem.group.id, groupItem.group.name]),
  );

  const chartDataByCategory = (() => {
    const categoryTotals = new Map<string, number>();
    const categoryDetails = new Map<
      string,
      { description: string; amount: number }[]
    >();

    if (groupIds.length === 0) {
      return [];
    }

    for (const expense of dashboardExpenseRows) {
      const groupId = expense.group_id;
      const categoryId = parseExpenseCategoryId(expense.category);
      const expenseAmount = Number(expense.amount);
      categoryTotals.set(
        categoryId,
        (categoryTotals.get(categoryId) ?? 0) + expenseAmount,
      );
      const groupLabel = groupNameById.get(groupId) ?? "";
      const descriptionText =
        (expense.description as string | null)?.trim() ?? "";
      const detailLine =
        groupLabel.length > 0 && descriptionText.length > 0
          ? `${groupLabel} · ${descriptionText}`
          : groupLabel.length > 0
            ? groupLabel
            : descriptionText;
      const detailList = categoryDetails.get(categoryId) ?? [];
      detailList.push({
        description: detailLine,
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

  const dashboardChartsTranslations = await getTranslations("GroupCharts");
  const dashboardPageTranslations = await getTranslations("Dashboard");
  const loginTranslations = await getTranslations("Login");

  return (
    <div className="mx-auto w-full max-w-[980px] px-4 py-6">
      <PageHeader title={dashboardPageTranslations("subtitle")} />

      <DashboardStatsGrid
        totalExpense={totalExpense}
        groupCount={groupCount}
        avgPerGroup={avgPerGroup}
        labels={{
          totalSpend: dashboardPageTranslations("statTotalSpend"),
          groupCount: dashboardPageTranslations("statGroupCount"),
          avgPerGroup: dashboardPageTranslations("statAvgPerGroup"),
        }}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardSpendingChart
          chartByGroup={chartDataByGroup}
          chartByCategory={chartDataByCategory}
          totalFormatted={formatYen(totalExpense)}
          titleByGroup={dashboardChartsTranslations("dashboardTitleByGroup")}
          titleByCategory={dashboardChartsTranslations("dashboardTitleByCategory")}
        />

        <DashboardGroupsList
          groups={groups.map((groupItem) => ({
            id: groupItem.group.id,
            name: groupItem.group.name,
            currencyCode: groupItem.group.currency_code,
            totalExpense: expenseTotalByGroup.get(groupItem.group.id) ?? 0,
          }))}
          currentUserId={user.id}
          hasPremium={dashboardHasPremium}
          locale={locale}
          labels={{
            title: dashboardPageTranslations("groupsCardTitle"),
            description: dashboardPageTranslations("groupsCardDescription"),
            createButton: dashboardPageTranslations("createGroupButton"),
            empty: dashboardPageTranslations("emptyGroups"),
          }}
        />
      </div>

      <footer className="mt-8 border-t border-[var(--apple-separator)] pt-6 text-center text-xs text-[var(--apple-text-secondary)]">
        <Link href="/terms" className="underline underline-offset-4 hover:text-[var(--apple-text)]">
          {loginTranslations("terms")}
        </Link>
        <span className="mx-2">·</span>
        <Link href="/privacy" className="underline underline-offset-4 hover:text-[var(--apple-text)]">
          {loginTranslations("privacy")}
        </Link>
        <span className="mx-2">·</span>
        <a
          href={BETA_FEEDBACK_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-[var(--apple-text)]"
        >
          {loginTranslations("feedbackForm")}
        </a>
      </footer>
    </div>
  );
}
