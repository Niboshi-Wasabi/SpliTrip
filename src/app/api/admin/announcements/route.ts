import { NextRequest, NextResponse } from "next/server";
import { requireAdminStepUpOrJson } from "@/lib/auth/admin-step-up-guard";
import { createRouteHandlerSupabaseClient } from "@/utils/supabase/route-handler";

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
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[admin announcements list]:", error);
    return NextResponse.json({ ok: false, message: "query_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, items: data ?? [] });
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
    is_published?: boolean;
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

  const { data, error } = await supabase
    .from("app_announcements")
    .insert({
      title_ja: body.title_ja ?? "",
      title_en: body.title_en ?? "",
      content_ja: body.content_ja ?? "",
      content_en: body.content_en ?? "",
      icon_type: iconType,
      priority: priority,
      is_published: body.is_published === true,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[admin announcements insert]:", error);
    return NextResponse.json({ ok: false, message: "insert_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data.id });
}
