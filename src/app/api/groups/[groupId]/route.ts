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

  const body = parsed as {
    name?: unknown;
    period_start_date?: unknown;
    period_end_date?: unknown;
  };

  const nameProvided = Object.prototype.hasOwnProperty.call(body, "name");
  const periodStartProvided = Object.prototype.hasOwnProperty.call(
    body,
    "period_start_date",
  );
  const periodEndProvided = Object.prototype.hasOwnProperty.call(
    body,
    "period_end_date",
  );

  if (periodStartProvided !== periodEndProvided) {
    return NextResponse.json({ error: "period_both_required" }, { status: 400 });
  }

  let trimmedNameForUpdate: string | undefined;
  if (nameProvided) {
    const trimmedName = String(body.name ?? "").trim();
    if (trimmedName.length === 0) {
      return NextResponse.json({ error: "name_required" }, { status: 400 });
    }
    if (trimmedName.length > 100) {
      return NextResponse.json({ error: "name_too_long" }, { status: 400 });
    }
    trimmedNameForUpdate = trimmedName;
  }

  let periodStartForUpdate: string | null | undefined;
  let periodEndForUpdate: string | null | undefined;
  if (periodStartProvided && periodEndProvided) {
    const startDateRaw =
      typeof body.period_start_date === "string"
        ? body.period_start_date.trim()
        : "";
    const endDateRaw =
      typeof body.period_end_date === "string"
        ? body.period_end_date.trim()
        : "";
    const bothPeriodBlank =
      startDateRaw.length === 0 && endDateRaw.length === 0;
    const bothPeriodFilled =
      startDateRaw.length > 0 && endDateRaw.length > 0;
    if (!bothPeriodBlank && !bothPeriodFilled) {
      return NextResponse.json(
        { error: "period_required_pair" },
        { status: 400 },
      );
    }
    if (bothPeriodFilled && startDateRaw > endDateRaw) {
      return NextResponse.json({ error: "period_invalid_range" }, { status: 400 });
    }
    periodStartForUpdate = bothPeriodFilled ? startDateRaw : null;
    periodEndForUpdate = bothPeriodFilled ? endDateRaw : null;
  }

  if (!trimmedNameForUpdate && periodStartForUpdate === undefined) {
    return NextResponse.json({ error: "empty_patch" }, { status: 400 });
  }

  type GroupUpdatePayload = {
    name?: string;
    period_start_date?: string | null;
    period_end_date?: string | null;
  };

  const updatePayload: GroupUpdatePayload = {};
  if (trimmedNameForUpdate !== undefined) {
    updatePayload.name = trimmedNameForUpdate;
  }
  if (periodStartForUpdate !== undefined && periodEndForUpdate !== undefined) {
    updatePayload.period_start_date = periodStartForUpdate;
    updatePayload.period_end_date = periodEndForUpdate;
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

  const updateResponse = await supabase.from("groups").update(updatePayload)
    .eq("id", groupId)
    .select("id, name, period_start_date, period_end_date")
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
