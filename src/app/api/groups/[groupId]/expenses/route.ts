/**
 * Insert `group_expenses` plus `expense_splits` using shared split math.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  buildExpenseSplitRows,
  parseRemainderPolicy,
  type SplitMode,
} from "@/lib/group-expense-split-server";
import { fetchGroupDetailForUser } from "@/lib/group-queries";
import { createClient } from "@/utils/supabase/server";

type RouteContext = { params: Promise<{ groupId: string }> };

type ExpenseBody = {
  payer_id?: string;
  amount?: unknown;
  description?: unknown;
  expense_date?: unknown;
  split_mode?: unknown;
  remainder_policy?: unknown;
  manual_splits?: unknown;
  share_inputs?: unknown;
  percent_inputs?: unknown;
  itemized_lines?: unknown;
};

function parseSplitMode(raw: unknown): SplitMode {
  const sm = String(raw ?? "equal").toLowerCase();
  if (sm === "manual" || sm === "exact") {
    return "exact";
  }
  if (sm === "shares" || sm === "share") {
    return "shares";
  }
  if (sm === "percent" || sm === "percentage" || sm === "percentages") {
    return "percent";
  }
  if (sm === "itemized") {
    return "itemized";
  }
  return "equal";
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { groupId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const detail = await fetchGroupDetailForUser(supabase, groupId, user.id);
  if (!detail.ok) {
    if (detail.error === "forbidden") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (detail.error === "group_not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ error: detail.error }, { status: 500 });
  }

  const memberUserIdsOrdered = detail.data.members.map((m) => m.user_id);
  const memberIds = new Set(memberUserIdsOrdered);

  const parsed: unknown = await request.json().catch(() => null);
  if (parsed === null || typeof parsed !== "object" || parsed === null) {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const body = parsed as ExpenseBody;
  const payer_id = String(body.payer_id ?? "");
  const amount = Number(body.amount);
  const description =
    body.description === undefined || body.description === null
      ? null
      : String(body.description);
  const expense_date = String(body.expense_date ?? "").trim();
  const splitMode = parseSplitMode(body.split_mode);
  const currencyCode = detail.data.group.currency_code;
  const policy = parseRemainderPolicy(
    body.remainder_policy,
    payer_id,
    memberIds,
  );

  if (!payer_id || !memberIds.has(payer_id)) {
    return NextResponse.json({ error: "invalid_payer" }, { status: 400 });
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }

  const dateStr =
    expense_date.length > 0 ? expense_date : new Date().toISOString().slice(0, 10);

  const built = buildExpenseSplitRows({
    splitMode,
    amount,
    currencyCode,
    memberUserIds: memberUserIdsOrdered,
    memberIds,
    payerId: payer_id,
    policy,
    body,
  });

  if (!built.ok) {
    return NextResponse.json({ error: built.error }, { status: 400 });
  }

  const splitRows = built.splitRows;

  const splitsJson = splitRows.map((s) => ({
    user_id: s.user_id,
    amount: s.amount,
    ratio: s.ratio,
  }));

  const { data: expenseId, error: rpcError } = await supabase.rpc(
    "insert_expense_with_splits",
    {
      p_group_id: groupId,
      p_payer_id: payer_id,
      p_amount: amount,
      p_description: description,
      p_expense_date: dateStr,
      p_splits: splitsJson,
    },
  );

  if (rpcError || !expenseId) {
    console.error("insert_expense_with_splits:", rpcError?.message);
    return NextResponse.json(
      { error: "expense_insert_failed", message: rpcError?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ expense_id: expenseId }, { status: 201 });
}
