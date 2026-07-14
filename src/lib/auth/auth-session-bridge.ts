import { NextResponse } from "next/server";
import { sanitizeRedirectPath } from "@/lib/auth/sanitize-redirect-path";

/**
 * Build a same-origin absolute post-auth URL from an open-redirect-safe path.
 * オープンリダイレクト安全な path から同一オリジン絶対 URL を作る。
 */
export function buildSameOriginPostAuthUrl(
  origin: string,
  redirectPath: string | null | undefined,
  fallbackPath: string,
): string {
  const safePath =
    sanitizeRedirectPath(redirectPath) ??
    sanitizeRedirectPath(fallbackPath) ??
    "/";
  return `${origin}${safePath}`;
}

/**
 * Return 200 HTML that keeps Set-Cookie on this response, then client-navigates.
 * Why: some Android in-app WebViews drop Set-Cookie on 302 Location redirects,
 * so OAuth appears to succeed while the next document request has no session.
 * 302 の Location 付き Set-Cookie を捨てる WebView 対策として、Cookie を 200 で確定してから遷移する。
 *
 * @param absoluteRedirectUrl - Same-origin absolute URL after auth / 認証後の同一オリジン絶対 URL
 */
export function createAuthSessionBridgeResponse(
  absoluteRedirectUrl: string,
): NextResponse {
  // JSON.stringify keeps href / JS / meta refresh payloads free of XSS / quote breaks.
  // JSON.stringify で href・JS・meta refresh への埋め込みを安全にする。
  const urlLiteral = JSON.stringify(absoluteRedirectUrl);
  const refreshLiteral = JSON.stringify(`0;url=${absoluteRedirectUrl}`);
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="Cache-Control" content="no-store" />
  <meta http-equiv="refresh" content=${refreshLiteral} />
  <title>Signing in…</title>
  <style>
    body{font-family:system-ui,sans-serif;margin:2rem;color:#1d1d1f;background:#f5f5f7}
    a{color:#0071e3}
  </style>
</head>
<body>
  <p>Signing you in…</p>
  <p><a href=${urlLiteral}>Continue</a></p>
  <script>
    try {
      location.replace(${urlLiteral});
    } catch (replaceError) {
      location.href = ${urlLiteral};
    }
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      Pragma: "no-cache",
    },
  });
}
