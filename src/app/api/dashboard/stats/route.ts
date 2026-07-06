import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabaseClient } from "@/utils/supabase/route-handler";
import { computeUnsettledDashboardSummary } from "@/lib/unsettled-dashboard";

/**
 * ダッシュボード統計API
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.json({ ok: false }, { status: 500 });
  const supabase = createRouteHandlerSupabaseClient(request, response);

  if (!supabase) {
    return NextResponse.json({ ok: false, message: "server_error" }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "unauthorized" }, { status: 401 });
  }

  try {
    const { data: userGroups, error: groupsError } = await supabase
      .from("group_members")
      .select(
        `
        group_id,
        groups!inner(id, name, currency_code, created_at)
      `,
      )
      .eq("user_id", user.id);

    if (groupsError) {
      console.error("[API Error - dashboard stats groups]:", groupsError);
      return NextResponse.json({ ok: false, message: "groups_error" }, { status: 500 });
    }

    const groupIds = userGroups?.map((membershipRow) => membershipRow.group_id) || [];

    if (groupIds.length === 0) {
      const successResponse = NextResponse.json({
        ok: true,
        totalExpenses: 0,
        unsettledAmount: 0,
        unsettledOwedByCurrency: {},
        totalMembers: 0,
        groupCount: 0,
      });
      successResponse.headers.set("Cache-Control", "private, max-age=120, s-maxage=120");
      return successResponse;
    }

    const currencyByGroupId = new Map<string, string>();
    for (const membershipRow of userGroups ?? []) {
      const groupRecord = membershipRow.groups as { currency_code?: string } | null;
      const currencyCode =
        typeof groupRecord?.currency_code === "string"
          ? groupRecord.currency_code
          : "JPY";
      currencyByGroupId.set(membershipRow.group_id as string, currencyCode);
    }

    const { data: expenses, error: expensesError } = await supabase
      .from("group_expenses")
      .select("amount, group_id")
      .in("group_id", groupIds);

    if (expensesError) {
      console.error("[API Error - dashboard stats expenses]:", expensesError);
      return NextResponse.json({ ok: false, message: "expenses_error" }, { status: 500 });
    }

    const { data: allMembers, error: membersError } = await supabase
      .from("group_members")
      .select("group_id, user_id")
      .in("group_id", groupIds);

    if (membersError) {
      console.error("[API Error - dashboard stats members]:", membersError);
      return NextResponse.json({ ok: false, message: "members_error" }, { status: 500 });
    }

    const totalExpenses =
      expenses?.reduce(
        (sum, expenseRow) => sum + (Number(expenseRow.amount) || 0),
        0,
      ) || 0;
    const uniqueMembers = new Set(
      allMembers?.map((memberRow) => memberRow.user_id) || [],
    );
    const totalMembers = uniqueMembers.size;

    const unsettledSummary = await computeUnsettledDashboardSummary(
      supabase,
      user.id,
      groupIds,
      currencyByGroupId,
    );

    const successResponse = NextResponse.json({
      ok: true,
      totalExpenses,
      unsettledAmount: unsettledSummary.unsettledAmountJpyEstimate,
      unsettledOwedByCurrency: unsettledSummary.unsettledOwedByCurrency,
      totalMembers,
      groupCount: groupIds.length,
    });

    successResponse.headers.set("Cache-Control", "private, max-age=120, s-maxage=120");
    return successResponse;
  } catch (error) {
    console.error("[API Error - dashboard stats]:", error);
    return NextResponse.json({ ok: false, message: "server_error" }, { status: 500 });
  }
}
