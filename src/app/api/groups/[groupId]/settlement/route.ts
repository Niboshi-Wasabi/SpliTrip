import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type RouteContext = { params: Promise<{ groupId: string }> };

type SettlementBody = { action?: unknown };

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
    console.error("[API/Action Error - POST /api/groups/[groupId]/settlement membership]:", {
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
  const action = String((parsedBody as SettlementBody).action ?? "").trim();
  if (action !== "finalize" && action !== "reopen") {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  const updatePayload =
    action === "finalize"
      ? { settlement_finalized_at: new Date().toISOString() }
      : { settlement_finalized_at: null };
  const updateResult = await supabase
    .from("groups")
    .update(updatePayload)
    .eq("id", groupId)
    .select("id, public_share_token, settlement_finalized_at")
    .maybeSingle();
  if (updateResult.error || !updateResult.data) {
    console.error("[API/Action Error - POST /api/groups/[groupId]/settlement update]:", {
      groupId,
      userId: user.id,
      error: updateResult.error,
    });
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({
    group_id: updateResult.data.id,
    public_share_token: updateResult.data.public_share_token,
    settlement_finalized_at: updateResult.data.settlement_finalized_at,
  });
}
