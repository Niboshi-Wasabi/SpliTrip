import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminStepUpOrJson } from "@/lib/auth/admin-step-up-guard";
import { createRouteHandlerSupabaseClient } from "@/utils/supabase/route-handler";
import { getSupabaseEnv } from "@/utils/supabase/env";

type RouteParams = { params: Promise<{ groupId: string }> };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/**
 * 管理者専用: グループの出費一覧を読取専用で返す。閲覧は必ず `admin_audit_logs` に残す。
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const base = NextResponse.json({ ok: false }, { status: 500 });
  const supabase = createRouteHandlerSupabaseClient(request, base);
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "server_error" }, { status: 500 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "unauthorized" }, { status: 401 });
  }
  const { data: p } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (p?.is_admin !== true) {
    return NextResponse.json({ ok: false, message: "forbidden" }, { status: 403 });
  }
  const block = requireAdminStepUpOrJson(request, user.id);
  if (block) {
    return block;
  }

  const { groupId } = await params;
  if (!isUuid(groupId)) {
    return NextResponse.json({ ok: false, message: "invalid_group_id" }, { status: 400 });
  }
  const env = getSupabaseEnv();
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!env || !serviceRole) {
    return NextResponse.json({ ok: false, message: "server_error" }, { status: 500 });
  }
  const admin = createSupabaseClient(env.url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: group, error: gErr } = await admin
    .from("groups")
    .select("id, name, currency_code, created_at")
    .eq("id", groupId)
    .maybeSingle();
  if (gErr) {
    console.error("[support get group]:", gErr);
    return NextResponse.json({ ok: false, message: "query_error" }, { status: 500 });
  }
  if (!group) {
    return NextResponse.json({ ok: false, message: "group_not_found" }, { status: 404 });
  }

  const { data: expenses, error: eErr } = await admin
    .from("group_expenses")
    .select(
      "id, group_id, payer_id, amount, description, category, created_at, expense_date, receipt_url",
    )
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });
  if (eErr) {
    console.error("[support get expenses]:", eErr);
    return NextResponse.json({ ok: false, message: "query_error" }, { status: 500 });
  }

  await admin.from("admin_audit_logs").insert({
    admin_user_id: user.id,
    target_user_id: null,
    action: "support_view_group",
    details: {
      group_id: groupId,
      expense_count: (expenses ?? []).length,
    },
  });

  return NextResponse.json({
    ok: true,
    group,
    expenses: expenses ?? [],
  });
}
