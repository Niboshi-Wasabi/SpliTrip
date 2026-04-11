/**
 * Update or delete a single group expense (member-only). Deletes cascade splits.
 * Triggers `audit_logs` via DB trigger.
 */

import { NextRequest, NextResponse } from "next/server";
import { parseExpenseCategoryId } from "@/lib/expense-categories";
import { createClient } from "@/utils/supabase/server";

type RouteContext = { params: Promise<{ groupId: string; expenseId: string }> };

type PatchBody = {
  description?: unknown;
  expense_date?: unknown;
  category?: unknown;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { groupId, expenseId } = await context.params;
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

  const body = parsedBody as PatchBody;
  const patch: Record<string, string | null> = {};

  if ("description" in body) {
    if (body.description === null) {
      patch.description = null;
    } else {
      patch.description = String(body.description ?? "").trim() || null;
    }
  }

  if ("expense_date" in body) {
    const dateRaw = String(body.expense_date ?? "").trim();
    if (dateRaw.length === 0) {
      return NextResponse.json({ error: "invalid_date" }, { status: 400 });
    }
    patch.expense_date = dateRaw;
  }

  if ("category" in body) {
    patch.category = parseExpenseCategoryId(body.category);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "empty_patch" }, { status: 400 });
  }

  const { data: updatedRows, error: updateError } = await supabase
    .from("group_expenses")
    .update(patch)
    .eq("id", expenseId)
    .eq("group_id", groupId)
    .select("id");

  if (updateError) {
    console.error(
      "[API/Action Error - PATCH /api/groups/[groupId]/expenses/[expenseId]]:",
      updateError,
    );
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  if (!updatedRows || updatedRows.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { groupId, expenseId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: deletedRows, error: deleteError } = await supabase
    .from("group_expenses")
    .delete()
    .eq("id", expenseId)
    .eq("group_id", groupId)
    .select("id");

  if (deleteError) {
    console.error(
      "[API/Action Error - DELETE /api/groups/[groupId]/expenses/[expenseId]]:",
      deleteError,
    );
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  if (!deletedRows || deletedRows.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
