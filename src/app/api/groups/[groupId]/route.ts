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
