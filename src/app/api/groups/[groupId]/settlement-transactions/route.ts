/**
 * Mark a computed settlement transfer as paid (debtor only).
 * 計算済み精算行を送金済みとして永続化する（支払人のみ）。
 */

import { NextResponse } from "next/server";
import { fetchGroupDetailForUser } from "@/lib/group-queries";
import { buildSettlementPairKey } from "@/lib/settlement-transactions";
import { createClient } from "@/utils/supabase/server";

type RouteContext = { params: Promise<{ groupId: string }> };

const INTERNAL_SERVER_ERROR_MESSAGE =
  "サーバーで予期せぬエラーが発生しました。";

type MarkPaidBody = {
  from_user_id?: unknown;
  to_user_id?: unknown;
  amount?: unknown;
};

export async function POST(request: Request, context: RouteContext) {
  const { groupId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsedBody: unknown = await request.json().catch(() => null);
  if (parsedBody === null || typeof parsedBody !== "object") {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const body = parsedBody as MarkPaidBody;
  const fromUserId = String(body.from_user_id ?? "").trim();
  const toUserId = String(body.to_user_id ?? "").trim();
  const amount = Number(body.amount);

  if (!fromUserId || !toUserId || fromUserId === toUserId) {
    return NextResponse.json({ error: "invalid_participants" }, { status: 400 });
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }

  if (fromUserId !== user.id) {
    return NextResponse.json({ error: "debtor_only" }, { status: 403 });
  }

  const detail = await fetchGroupDetailForUser(supabase, groupId, user.id);
  if (!detail.ok) {
    if (detail.error === "forbidden") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (detail.error === "group_not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "group_fetch_failed", message: INTERNAL_SERVER_ERROR_MESSAGE },
      { status: 500 },
    );
  }

  const pairKey = buildSettlementPairKey(fromUserId, toUserId);
  const matchingSettlement = detail.data.settlements.find(
    (settlementRow) =>
      buildSettlementPairKey(
        settlementRow.fromUserId,
        settlementRow.toUserId,
      ) === pairKey,
  );

  if (!matchingSettlement) {
    return NextResponse.json({ error: "transfer_not_found" }, { status: 404 });
  }

  if (Math.abs(matchingSettlement.amount - amount) >= 0.01) {
    return NextResponse.json({ error: "amount_mismatch" }, { status: 409 });
  }

  const currencyCode = detail.data.group.currency_code.trim().toUpperCase();

  // Void any stale paid row for the same pair before inserting fresh snapshot.
  await supabase
    .from("settlement_transactions")
    .update({ status: "void" })
    .eq("group_id", groupId)
    .eq("from_user_id", fromUserId)
    .eq("to_user_id", toUserId)
    .eq("status", "paid");

  const { data: insertedRow, error: insertError } = await supabase
    .from("settlement_transactions")
    .insert({
      group_id: groupId,
      from_user_id: fromUserId,
      to_user_id: toUserId,
      amount,
      currency_code: currencyCode,
      status: "paid",
      marked_by_user_id: user.id,
    })
    .select("id, marked_at")
    .maybeSingle();

  if (insertError) {
    console.error(
      "[API/Action Error - POST settlement-transactions insert]:",
      insertError,
    );
    const message = String(insertError.message ?? "").toLowerCase();
    if (message.includes("settlement_transactions")) {
      return NextResponse.json({ error: "schema_missing" }, { status: 503 });
    }
    return NextResponse.json(
      { error: "save_failed", message: INTERNAL_SERVER_ERROR_MESSAGE },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    marked_at: insertedRow?.marked_at ?? new Date().toISOString(),
  });
}
