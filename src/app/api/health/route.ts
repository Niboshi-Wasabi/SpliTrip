import { NextResponse } from "next/server";

/**
 * ロードバランサ・監視向けの軽量ヘルスチェック。メンテナンス中も 200 を返す。
 */
export async function GET() {
  return NextResponse.json({ ok: true, service: "splitrip" });
}
