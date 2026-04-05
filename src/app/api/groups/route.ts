/**
 * Create a new split group; DB trigger adds the creator as owner member.
 * Returns `invite_token` so API clients can share the link without a second query.
 * 新しい割り勘グループを作成する。DB トリガーで作成者を owner メンバーに追加する。
 * `invite_token` を返し、2 回目の取得なしで招待リンクを共有できるようにする。
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed: unknown = await request.json().catch(() => null);
  if (parsed === null || typeof parsed !== "object" || parsed === null) {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const body = parsed as { name?: unknown; currency_code?: unknown };
  const name = String(body.name ?? "").trim();
  const currencyRaw = String(body.currency_code ?? "JPY")
    .trim()
    .toUpperCase();

  if (!name) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }

  const currency_code =
    currencyRaw.length >= 3 ? currencyRaw.slice(0, 3) : "JPY";

  /**
   * Same as server action: RPC avoids RLS false negatives on `groups` insert from API routes.
   * サーバーアクションと同様、API からの groups 挿入で RLS が誤って弾くのを避ける。
   */
  const { data: rpcRows, error } = await supabase.rpc(
    "create_group_with_invite",
    {
      p_name: name,
      p_currency: currency_code,
    },
  );

  if (error) {
    console.error("POST /api/groups:", error.message);
    if (error.message.includes("not_authenticated")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (error.message.includes("name_required")) {
      return NextResponse.json({ error: "name_required" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "insert_failed", message: error.message },
      { status: 500 },
    );
  }

  const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
  if (
    !row ||
    typeof row !== "object" ||
    !("id" in row) ||
    !("name" in row)
  ) {
    return NextResponse.json({ error: "invalid_response" }, { status: 500 });
  }

  const group = row as {
    id: string;
    name: string;
    currency_code: string;
    created_at: string;
    invite_token: string;
  };

  return NextResponse.json({ group }, { status: 201 });
}
