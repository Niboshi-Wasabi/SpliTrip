/**
 * Audit log entries for one expense (timeline in the detail modal).
 * 1 件の出費に紐づく監査ログ（詳細モーダルのタイムライン）。
 */

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type RouteContext = { params: Promise<{ groupId: string; expenseId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { groupId, expenseId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: expenseRow, error: expenseError } = await supabase
    .from("group_expenses")
    .select("id")
    .eq("id", expenseId)
    .eq("group_id", groupId)
    .maybeSingle();

  if (expenseError) {
    console.error(
      "[API/Action Error - GET /api/groups/[groupId]/expenses/[expenseId]/audit expense lookup]:",
      expenseError,
    );
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }

  if (!expenseRow) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: logs, error: logsError } = await supabase
    .from("audit_logs")
    .select("id, expense_id, actor_id, action, payload, created_at")
    .eq("group_id", groupId)
    .eq("expense_id", expenseId)
    .order("created_at", { ascending: false });

  if (logsError) {
    console.error(
      "[API/Action Error - GET /api/groups/[groupId]/expenses/[expenseId]/audit logs query]:",
      logsError,
    );
    return NextResponse.json({ error: "audit_fetch_failed" }, { status: 500 });
  }

  return NextResponse.json({ items: logs ?? [] });
}
