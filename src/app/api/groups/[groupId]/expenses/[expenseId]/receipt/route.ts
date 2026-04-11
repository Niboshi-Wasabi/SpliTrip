/**
 * Short-lived signed URL for a private receipt object in Storage.
 * Storage 上の非公開領収書オブジェクト用の短命署名 URL を発行する。
 *
 * Why server-side signing: the browser must not use the service role; we verify
 * membership then call `createSignedUrl` with the user-scoped Supabase client.
 * 理由: サービスロールはブラウザに渡さない。メンバー確認後にユーザークライアントで署名する。
 */

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type RouteContext = { params: Promise<{ groupId: string; expenseId: string }> };

const SIGNED_URL_TTL_SECONDS = 120;

export async function GET(_request: Request, context: RouteContext) {
  const { groupId, expenseId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: expenseRow, error: expenseError } = await supabase
    .from("group_expenses")
    .select("id, receipt_url")
    .eq("id", expenseId)
    .eq("group_id", groupId)
    .maybeSingle();

  if (expenseError) {
    console.error(
      "[API/Action Error - GET /api/groups/[groupId]/expenses/[expenseId]/receipt expense lookup]:",
      expenseError,
    );
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }

  if (!expenseRow) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const storagePath =
    typeof expenseRow.receipt_url === "string"
      ? expenseRow.receipt_url.trim()
      : "";

  if (storagePath.length === 0) {
    return NextResponse.json({ error: "no_receipt" }, { status: 404 });
  }

  const pathSegments = storagePath.split("/").filter(Boolean);
  if (
    pathSegments.length < 3 ||
    pathSegments[0] !== groupId ||
    pathSegments[1] !== expenseId
  ) {
    console.error("receipt path mismatch", { groupId, expenseId, storagePath });
    return NextResponse.json({ error: "invalid_receipt_path" }, { status: 400 });
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("receipts")
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (signError || !signed?.signedUrl) {
    console.error(
      "[API/Action Error - GET /api/groups/[groupId]/expenses/[expenseId]/receipt createSignedUrl]:",
      signError,
    );
    return NextResponse.json({ error: "sign_failed" }, { status: 500 });
  }

  return NextResponse.json({
    signedUrl: signed.signedUrl,
    expiresIn: SIGNED_URL_TTL_SECONDS,
  });
}
