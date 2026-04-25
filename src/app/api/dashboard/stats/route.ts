import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerSupabaseClient } from "@/utils/supabase/route-handler";

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
    // ユーザーが参加しているグループを取得（必要フィールドのみ）
    const { data: userGroups, error: groupsError } = await supabase
      .from("group_members")
      .select(`
        group_id,
        groups!inner(id, name, currency, created_at)
      `)
      .eq("user_id", user.id);

    if (groupsError) {
      console.error("[API Error - dashboard stats groups]:", groupsError);
      return NextResponse.json({ ok: false, message: "groups_error" }, { status: 500 });
    }

    const groupIds = userGroups?.map(ug => ug.group_id) || [];

    if (groupIds.length === 0) {
      const successResponse = NextResponse.json({ 
        ok: true, 
        totalExpenses: 0,
        unsettledAmount: 0,
        totalMembers: 0,
        groupCount: 0
      });
      successResponse.headers.set('Cache-Control', 'private, max-age=120, s-maxage=120');
      return successResponse;
    }

    // 各グループの出費を取得
    const { data: expenses, error: expensesError } = await supabase
      .from("group_expenses")
      .select("amount, group_id")
      .in("group_id", groupIds);

    if (expensesError) {
      console.error("[API Error - dashboard stats expenses]:", expensesError);
      return NextResponse.json({ ok: false, message: "expenses_error" }, { status: 500 });
    }

    // 各グループのメンバー数を取得
    const { data: allMembers, error: membersError } = await supabase
      .from("group_members")
      .select("group_id, user_id")
      .in("group_id", groupIds);

    if (membersError) {
      console.error("[API Error - dashboard stats members]:", membersError);
      return NextResponse.json({ ok: false, message: "members_error" }, { status: 500 });
    }

    // 統計を計算
    const totalExpenses = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
    const uniqueMembers = new Set(allMembers?.map(m => m.user_id) || []);
    const totalMembers = uniqueMembers.size;
    
    // TODO: 実際の未精算額計算ロジックを実装
    // 現在は仮実装（将来的にはsettlement_transactionsテーブルと照合）
    const unsettledAmount = 0; // 正確な計算まで0を返す

    const successResponse = NextResponse.json({ 
      ok: true, 
      totalExpenses,
      unsettledAmount,
      totalMembers,
      groupCount: groupIds.length
    });
    
    // 統計は2分間キャッシュ
    successResponse.headers.set('Cache-Control', 'private, max-age=120, s-maxage=120');
    return successResponse;

  } catch (error) {
    console.error("[API Error - dashboard stats]:", error);
    return NextResponse.json({ ok: false, message: "server_error" }, { status: 500 });
  }
}