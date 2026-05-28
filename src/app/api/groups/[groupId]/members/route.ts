import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type RouteContext = { params: Promise<{ groupId: string }> };

function normalizeDisplayName(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

export async function POST(request: Request, context: RouteContext) {
  const { groupId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const membershipResult = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (membershipResult.error) {
    console.error("[API/Action Error - POST /api/groups/[groupId]/members membership]:", {
      groupId,
      userId: user.id,
      error: membershipResult.error,
    });
    return NextResponse.json({ error: "member_lookup_failed" }, { status: 500 });
  }
  if (!membershipResult.data || membershipResult.data.role !== "owner") {
    return NextResponse.json({ error: "owner_only" }, { status: 403 });
  }

  const parsedBody: unknown = await request.json().catch(() => null);
  if (parsedBody === null || typeof parsedBody !== "object") {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const provisionalDisplayName = normalizeDisplayName(
    (parsedBody as { provisional_display_name?: unknown }).provisional_display_name,
  );
  if (provisionalDisplayName.length === 0) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }
  if (provisionalDisplayName.length > 50) {
    return NextResponse.json({ error: "name_too_long" }, { status: 400 });
  }

  const provisionalUserId = crypto.randomUUID();
  const insertResult = await supabase
    .from("group_members")
    .insert({
      group_id: groupId,
      user_id: provisionalUserId,
      role: "member",
      is_provisional: true,
      provisional_display_name: provisionalDisplayName,
    })
    .select("group_id, user_id, role, is_provisional, provisional_display_name")
    .maybeSingle();

  if (insertResult.error || !insertResult.data) {
    console.error("[API/Action Error - POST /api/groups/[groupId]/members insert]:", {
      groupId,
      userId: user.id,
      error: insertResult.error,
    });
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ member: insertResult.data }, { status: 201 });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { groupId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const membershipResult = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (membershipResult.error) {
    console.error("[API/Action Error - DELETE /api/groups/[groupId]/members membership]:", {
      groupId,
      userId: user.id,
      error: membershipResult.error,
    });
    return NextResponse.json({ error: "member_lookup_failed" }, { status: 500 });
  }
  if (!membershipResult.data || membershipResult.data.role !== "owner") {
    return NextResponse.json({ error: "owner_only" }, { status: 403 });
  }

  const parsedBody: unknown = await request.json().catch(() => null);
  if (parsedBody === null || typeof parsedBody !== "object") {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const memberUserId =
    typeof (parsedBody as { user_id?: unknown }).user_id === "string"
      ? (parsedBody as { user_id: string }).user_id.trim()
      : "";
  if (memberUserId.length === 0) {
    return NextResponse.json({ error: "user_id_required" }, { status: 400 });
  }

  const deleteResult = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", memberUserId)
    .eq("is_provisional", true)
    .select("user_id")
    .maybeSingle();
  if (deleteResult.error) {
    console.error("[API/Action Error - DELETE /api/groups/[groupId]/members remove]:", {
      groupId,
      userId: user.id,
      memberUserId,
      error: deleteResult.error,
    });
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  if (!deleteResult.data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
