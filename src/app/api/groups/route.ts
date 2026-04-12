/**
 * Create a new split group; DB trigger adds the creator as owner member.
 * 表示名（display_name）の更新は `PATCH /api/profile/display-name` で行う（50 文字制限あり）。
 * Returns `invite_token` so API clients can share the link without a second query.
 * 新しい割り勘グループを作成する。DB トリガーで作成者を owner メンバーに追加する。
 * `invite_token` を返し、2 回目の取得なしで招待リンクを共有できるようにする。
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const INTERNAL_SERVER_ERROR_MESSAGE =
  "サーバーで予期せぬエラーが発生しました。";

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
    console.error("[API/Action Error - POST /api/groups create_group_with_invite]:", error);
    const detail = `${error.message ?? ""} ${"details" in error && typeof error.details === "string" ? error.details : ""}`;
    if (detail.includes("not_authenticated")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (detail.includes("name_required")) {
      return NextResponse.json({ error: "name_required" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "insert_failed", message: INTERNAL_SERVER_ERROR_MESSAGE },
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
