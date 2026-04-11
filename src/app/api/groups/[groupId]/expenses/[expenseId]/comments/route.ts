import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { fetchGroupDetailForUser } from "@/lib/group-queries";

type RouteContext = {
  params: Promise<{ groupId: string; expenseId: string }>;
};

const INTERNAL_SERVER_ERROR_MESSAGE =
  "サーバーで予期せぬエラーが発生しました。";

export async function GET(_request: NextRequest, context: RouteContext) {
  const { groupId, expenseId } = await context.params;
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
    console.error(
      "[API/Action Error - GET /api/groups/[groupId]/expenses/[expenseId]/comments detail lookup]:",
      {
        groupId,
        expenseId,
        userId: user.id,
        lookupError: detail.error,
      },
    );
    return NextResponse.json(
      { error: "group_lookup_failed", message: INTERNAL_SERVER_ERROR_MESSAGE },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("expense_comments")
    .select("id, body, created_at, author_id")
    .eq("expense_id", expenseId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(
      "[API/Action Error - GET /api/groups/[groupId]/expenses/[expenseId]/comments query]:",
      error,
    );
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  return NextResponse.json({ comments: data ?? [] });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { groupId, expenseId } = await context.params;
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
    console.error(
      "[API/Action Error - POST /api/groups/[groupId]/expenses/[expenseId]/comments detail lookup]:",
      {
        groupId,
        expenseId,
        userId: user.id,
        lookupError: detail.error,
      },
    );
    return NextResponse.json(
      { error: "group_lookup_failed", message: INTERNAL_SERVER_ERROR_MESSAGE },
      { status: 500 },
    );
  }

  const expenseBelongs = detail.data.expenses.some(
    (expenseRow) => expenseRow.id === expenseId,
  );
  if (!expenseBelongs) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const parsed: unknown = await request.json().catch(() => null);
  const bodyText =
    parsed !== null &&
    typeof parsed === "object" &&
    parsed !== null &&
    typeof (parsed as { body?: unknown }).body === "string"
      ? (parsed as { body: string }).body.trim()
      : "";

  if (bodyText.length === 0 || bodyText.length > 2000) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { data: inserted, error } = await supabase
    .from("expense_comments")
    .insert({
      expense_id: expenseId,
      author_id: user.id,
      body: bodyText,
    })
    .select("id, body, created_at, author_id")
    .maybeSingle();

  if (error || !inserted) {
    console.error(
      "[API/Action Error - POST /api/groups/[groupId]/expenses/[expenseId]/comments insert]:",
      {
        error,
        groupId,
        expenseId,
        userId: user.id,
      },
    );
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ comment: inserted }, { status: 201 });
}
