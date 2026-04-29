import { NextRequest, NextResponse } from "next/server";
import { requireAdminStepUpOrJson } from "@/lib/auth/admin-step-up-guard";
import { createRouteHandlerSupabaseClient } from "@/utils/supabase/route-handler";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

/**
 * 管理者: 告知一覧（下書き含む） / 新規作成。
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

  const { data, error } = await supabase
    .from("app_announcements")
    .select(
      "id, title_ja, title_en, content_ja, content_en, icon_type, priority, display_order, is_published, expires_at, created_at, updated_at",
    )
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[admin announcements list]:", error);
    return NextResponse.json({ ok: false, message: "query_error" }, { status: 500 });
  }
  const successResponse = NextResponse.json({ ok: true, items: data ?? [] });
  // 管理画面では短いキャッシュで最新性を保つ
  successResponse.headers.set('Cache-Control', 'private, max-age=30, s-maxage=30');
  return successResponse;
}

export async function POST(request: NextRequest) {
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

  type Body = {
    title_ja?: string;
    title_en?: string;
    content_ja?: string;
    content_en?: string;
    icon_type?: string;
    priority?: number;
    display_order?: number;
    is_published?: boolean;
    expires_at?: string | null;
  };
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "invalid_json" }, { status: 400 });
  }
  // アイコンタイプのバリデーション
  const validIconTypes = ['feature', 'bugfix', 'announcement', 'design', 'security', 'maintenance'];
  const iconType = body.icon_type && validIconTypes.includes(body.icon_type) 
    ? body.icon_type 
    : 'announcement';

  // 優先度のバリデーション  
  const priority = typeof body.priority === 'number' && body.priority >= 0 && body.priority <= 2
    ? body.priority
    : 0;
  const displayOrder =
    typeof body.display_order === "number" &&
    Number.isFinite(body.display_order)
      ? Math.max(0, Math.min(999_999, Math.floor(body.display_order)))
      : 0;
  let expiresAt: string | null = null;
  if (body.expires_at !== undefined && body.expires_at !== null && body.expires_at !== "") {
    const parsedExpiresAt = new Date(body.expires_at);
    if (Number.isNaN(parsedExpiresAt.getTime())) {
      return NextResponse.json({ ok: false, message: "invalid_expires_at" }, { status: 400 });
    }
    expiresAt = parsedExpiresAt.toISOString();
  }

  const { data, error } = await supabase
    .from("app_announcements")
    .insert({
      title_ja: body.title_ja ?? "",
      title_en: body.title_en ?? "",
      content_ja: body.content_ja ?? "",
      content_en: body.content_en ?? "",
      icon_type: iconType,
      priority: priority,
      display_order: displayOrder,
      is_published: body.is_published === true,
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[admin announcements insert]:", error);
    return NextResponse.json({ ok: false, message: "insert_error" }, { status: 500 });
  }

  try {
    const serviceRoleSupabase = createServiceRoleClient();
    await serviceRoleSupabase.from("admin_audit_logs").insert({
      admin_user_id: user.id,
      target_user_id: null,
      action: "announcement_create",
      details: {
        announcement_id: data.id,
        icon_type: iconType,
        priority,
        display_order: displayOrder,
        is_published: body.is_published === true,
        expires_at: expiresAt,
      },
    });
  } catch (caughtError) {
    console.error("[admin announcements audit insert]:", caughtError);
  }

  return NextResponse.json({ ok: true, id: data.id });
}
