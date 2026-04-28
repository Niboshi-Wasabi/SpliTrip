import { NextRequest, NextResponse } from "next/server";
import { requireAdminStepUpOrJson } from "@/lib/auth/admin-step-up-guard";
import { createRouteHandlerSupabaseClient } from "@/utils/supabase/route-handler";

type RouteParams = { params: Promise<{ id: string }> };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
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
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ ok: false, message: "invalid_id" }, { status: 400 });
  }
  type Body = {
    title_ja?: string;
    title_en?: string;
    content_ja?: string;
    content_en?: string;
    icon_type?: string;
    priority?: number;
    is_published?: boolean;
    expires_at?: string | null;
  };
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "invalid_json" }, { status: 400 });
  }
  const validIconTypes = ['feature', 'bugfix', 'announcement', 'design', 'security', 'maintenance'];
  
  const patch: Record<string, string | boolean | number | null> = {};
  if (body.title_ja !== undefined) patch.title_ja = body.title_ja;
  if (body.title_en !== undefined) patch.title_en = body.title_en;
  if (body.content_ja !== undefined) patch.content_ja = body.content_ja;
  if (body.content_en !== undefined) patch.content_en = body.content_en;
  if (body.icon_type !== undefined && validIconTypes.includes(body.icon_type)) {
    patch.icon_type = body.icon_type;
  }
  if (body.priority !== undefined && typeof body.priority === 'number' && body.priority >= 0 && body.priority <= 2) {
    patch.priority = body.priority;
  }
  if (body.is_published !== undefined) patch.is_published = body.is_published;
  if (body.expires_at !== undefined) {
    if (body.expires_at === null || body.expires_at === "") {
      patch.expires_at = null;
    } else {
      const parsedExpiresAt = new Date(body.expires_at);
      if (Number.isNaN(parsedExpiresAt.getTime())) {
        return NextResponse.json({ ok: false, message: "invalid_expires_at" }, { status: 400 });
      }
      patch.expires_at = parsedExpiresAt.toISOString();
    }
  }
  const { error } = await supabase
    .from("app_announcements")
    .update(patch)
    .eq("id", id);
  if (error) {
    console.error("[admin announcement update]:", error);
    return NextResponse.json({ ok: false, message: "update_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ ok: false, message: "invalid_id" }, { status: 400 });
  }
  const { data: deletedRows, error } = await supabase
    .from("app_announcements")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) {
    console.error("[admin announcement delete]:", error);
    return NextResponse.json({ ok: false, message: "delete_error" }, { status: 500 });
  }
  if (!deletedRows || deletedRows.length === 0) {
    return NextResponse.json({ ok: false, message: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
