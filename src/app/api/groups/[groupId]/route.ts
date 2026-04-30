/**
 * JSON detail for one group when the caller is a member (RLS-enforced on Supabase).
 */

import { NextResponse } from "next/server";
import { fetchGroupDetailForUser } from "@/lib/group-queries";
import { createClient } from "@/utils/supabase/server";

type RouteContext = { params: Promise<{ groupId: string }> };
const INTERNAL_SERVER_ERROR_MESSAGE =
  "サーバーで予期せぬエラーが発生しました。";

export async function GET(_request: Request, context: RouteContext) {
  const { groupId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await fetchGroupDetailForUser(supabase, groupId, user.id);

  if (!result.ok) {
    if (result.error === "forbidden") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (result.error === "group_not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    console.error("[API/Action Error - GET /api/groups/[groupId] detail lookup]:", {
      groupId,
      lookupError: result.error,
      userId: user.id,
    });
    return NextResponse.json(
      { error: "group_detail_failed", message: INTERNAL_SERVER_ERROR_MESSAGE },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: result.data });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { groupId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed: unknown = await request.json().catch(() => null);
  if (parsed === null || typeof parsed !== "object") {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const body = parsed as { name?: unknown };
  const trimmedName = String(body.name ?? "").trim();
  if (trimmedName.length === 0) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }
  if (trimmedName.length > 100) {
    return NextResponse.json({ error: "name_too_long" }, { status: 400 });
  }

  const membershipResponse = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipResponse.error) {
    console.error("[API/Action Error - PATCH /api/groups/[groupId] membership]:", {
      groupId,
      userId: user.id,
      error: membershipResponse.error,
    });
    return NextResponse.json(
      { error: "group_update_failed", message: INTERNAL_SERVER_ERROR_MESSAGE },
      { status: 500 },
    );
  }

  if (!membershipResponse.data) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (membershipResponse.data.role !== "owner") {
    return NextResponse.json({ error: "owner_only" }, { status: 403 });
  }

  const updateResponse = await supabase
    .from("groups")
    .update({ name: trimmedName })
    .eq("id", groupId)
    .select("id, name")
    .maybeSingle();

  if (updateResponse.error) {
    console.error("[API/Action Error - PATCH /api/groups/[groupId] update]:", {
      groupId,
      userId: user.id,
      error: updateResponse.error,
    });
    return NextResponse.json(
      { error: "group_update_failed", message: INTERNAL_SERVER_ERROR_MESSAGE },
      { status: 500 },
    );
  }

  if (!updateResponse.data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ group: updateResponse.data });
}
