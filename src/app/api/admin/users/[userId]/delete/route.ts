import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

type RouteContext = { params: Promise<{ userId: string }> };

const INTERNAL_SERVER_ERROR_MESSAGE =
  "サーバーで予期せぬエラーが発生しました。";

export async function POST(
  request: NextRequest,
  { params }: RouteContext,
) {
  try {
    const { userId: targetUserId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data: adminProfile, error: profileError } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[API/Action Error - admin user delete profile check]:", profileError);
      return NextResponse.json(
        { error: "profile_check_failed", message: INTERNAL_SERVER_ERROR_MESSAGE },
        { status: 500 },
      );
    }
    if (adminProfile?.is_admin !== true) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    if (targetUserId === user.id) {
      return NextResponse.json({ error: "self_delete_not_allowed" }, { status: 400 });
    }

    const serviceSupabase = createServiceRoleClient();
    const { data: targetProfile, error: targetProfileError } = await serviceSupabase
      .from("user_profiles")
      .select("id, is_admin, deleted_at, premium_access, premium_access_source")
      .eq("id", targetUserId)
      .maybeSingle();

    if (targetProfileError) {
      console.error("[API/Action Error - admin user delete target profile]:", targetProfileError);
      return NextResponse.json(
        { error: "target_profile_query_failed", message: INTERNAL_SERVER_ERROR_MESSAGE },
        { status: 500 },
      );
    }
    if (!targetProfile) {
      return NextResponse.json({ error: "target_user_not_found" }, { status: 404 });
    }
    if (targetProfile.is_admin === true) {
      return NextResponse.json({ error: "admin_delete_not_allowed" }, { status: 400 });
    }
    if (targetProfile.deleted_at) {
      return NextResponse.json({ ok: true, alreadyDeleted: true });
    }

    const nowIsoTimestamp = new Date().toISOString();
    const { error: markDeletedError } = await serviceSupabase
      .from("user_profiles")
      .update({
        deleted_at: nowIsoTimestamp,
        premium_access: false,
        premium_access_source: "none",
      })
      .eq("id", targetUserId);

    if (markDeletedError) {
      console.error("[API/Action Error - admin user delete mark deleted]:", markDeletedError);
      return NextResponse.json(
        { error: "mark_deleted_failed", message: INTERNAL_SERVER_ERROR_MESSAGE },
        { status: 500 },
      );
    }

    const { error: auditError } = await serviceSupabase
      .from("admin_audit_logs")
      .insert({
        admin_user_id: user.id,
        target_user_id: targetUserId,
        action: "delete_user",
        details: {
          previous_state: {
            deleted_at: null,
            premium_access: targetProfile.premium_access,
            premium_access_source: targetProfile.premium_access_source,
          },
          new_state: {
            deleted_at: nowIsoTimestamp,
            premium_access: false,
            premium_access_source: "none",
          },
        },
      });

    if (auditError) {
      console.error("[API/Action Error - admin user delete audit]:", auditError);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[API/Action Error - admin user delete]:", error);
    return NextResponse.json(
      { error: "server_error", message: INTERNAL_SERVER_ERROR_MESSAGE },
      { status: 500 },
    );
  }
}
