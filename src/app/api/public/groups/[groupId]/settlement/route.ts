import { NextResponse } from "next/server";
import {
  computeGroupSettlements,
  type ExpenseWithSplits,
  type GroupSettlement,
} from "@/lib/group-ledger";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

type RouteContext = { params: Promise<{ groupId: string }> };

type PublicSettlementPayload = {
  groupName: string;
  currencyCode: string;
  finalizedAt: string;
  settlements: GroupSettlement[];
};

export async function GET(request: Request, context: RouteContext) {
  const { groupId } = await context.params;
  const token = new URL(request.url).searchParams.get("t")?.trim() ?? "";
  if (!token) {
    return NextResponse.json({ error: "token_required" }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();
    const groupResult = await supabase
      .from("groups")
      .select("id, name, currency_code, public_share_token, settlement_finalized_at")
      .eq("id", groupId)
      .maybeSingle();
    if (groupResult.error || !groupResult.data) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (groupResult.data.public_share_token !== token) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (!groupResult.data.settlement_finalized_at) {
      return NextResponse.json({ error: "not_finalized" }, { status: 404 });
    }

    const membersResult = await supabase
      .from("group_members")
      .select("user_id, provisional_display_name")
      .eq("group_id", groupId);
    if (membersResult.error) {
      return NextResponse.json({ error: "members_fetch_failed" }, { status: 500 });
    }
    const memberUserIds = (membersResult.data ?? []).map((row) => row.user_id);
    const profilesResult =
      memberUserIds.length > 0
        ? await supabase
            .from("user_profiles")
            .select("id, display_name")
            .in("id", memberUserIds)
        : { data: [], error: null };
    if (profilesResult.error) {
      return NextResponse.json({ error: "profiles_fetch_failed" }, { status: 500 });
    }

    const displayNameByUserId: Record<string, string> = {};
    for (const memberRow of membersResult.data ?? []) {
      const profileRow = (profilesResult.data ?? []).find(
        (row) => row.id === memberRow.user_id,
      );
      const profileName =
        typeof profileRow?.display_name === "string"
          ? profileRow.display_name.trim()
          : "";
      const provisionalName =
        typeof memberRow.provisional_display_name === "string"
          ? memberRow.provisional_display_name.trim()
          : "";
      displayNameByUserId[memberRow.user_id] =
        profileName || provisionalName || "Member";
    }

    const expensesResult = await supabase
      .from("group_expenses")
      .select("payer_id, amount, expense_splits(user_id, amount)")
      .eq("group_id", groupId);
    if (expensesResult.error) {
      return NextResponse.json({ error: "expenses_fetch_failed" }, { status: 500 });
    }

    const ledgerEntries: ExpenseWithSplits[] = (expensesResult.data ?? []).map(
      (expenseRow) => ({
        payer_id: expenseRow.payer_id,
        amount: Number(expenseRow.amount),
        splits: (expenseRow.expense_splits ?? []).map((splitRow) => ({
          user_id: splitRow.user_id,
          amount: Number(splitRow.amount),
        })),
      }),
    );
    const settlements = computeGroupSettlements(ledgerEntries, displayNameByUserId);
    const payload: PublicSettlementPayload = {
      groupName: groupResult.data.name,
      currencyCode: groupResult.data.currency_code,
      finalizedAt: groupResult.data.settlement_finalized_at,
      settlements,
    };
    return NextResponse.json({ data: payload });
  } catch (error) {
    console.error("[API/Action Error - GET /api/public/groups/[groupId]/settlement]:", error);
    return NextResponse.json({ error: "unexpected_error" }, { status: 500 });
  }
}
