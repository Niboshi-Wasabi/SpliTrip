import type { NextResponse } from "next/server";

/**
 * ルート内で `createServerClient` が「別の `NextResponse`」に `Set-Cookie` した分を、
 * 最終的に return するレスポンスへ引き継ぐ。成功時に `NextResponse.json` を作り直すと
 * セッション再発行の Cookie が落ちる（クライアント遷移が不発・ログアウト状になる）。
 */
export function forwardSetCookieHeaders(
  from: NextResponse,
  to: NextResponse,
): void {
  const h = from.headers;
  if (typeof h.getSetCookie === "function") {
    for (const cookie of h.getSetCookie()) {
      to.headers.append("Set-Cookie", cookie);
    }
  }
}
