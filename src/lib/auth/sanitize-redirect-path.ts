import { routing, type AppLocale } from "@/i18n/routing";

/**
 * Restricts post-auth redirects to same-origin pathnames (open-redirect safe).
 * 認証後リダイレクトを同一オリジンのパスに限定する（オープンリダイレクト対策）。
 */
const MAX_REDIRECT_PATH_LEN = 2048;

export function sanitizeRedirectPath(
  rawPath: string | null | undefined,
): string | null {
  if (rawPath == null) return null;
  const trimmed = rawPath.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("..") ||
    trimmed.includes("\\") ||
    trimmed.length > MAX_REDIRECT_PATH_LEN
  ) {
    return null;
  }
  return trimmed;
}

/**
 * ミドルウェアの `?next=` は `pathname + search` で、英語のように prefix があると `/en/dashboard`
 * となる。`next-intl` の `useRouter` / `Link` に渡すパスは**ロケール接頭辞なし**（例: `/dashboard`）
 * である必要がある。ここで先頭の `/{locale}` を 1 段だけ外す（open-redirect 対策は
 * 先に `sanitizeRedirectPath` を通した値だけを扱うこと）。
 */
export function toIntlRouterPathFromMiddlewareNext(
  rawPath: string | null | undefined,
): string | null {
  const sanitized = sanitizeRedirectPath(rawPath);
  if (sanitized == null) {
    return null;
  }
  const hashIndex = sanitized.indexOf("#");
  const beforeHash = hashIndex >= 0 ? sanitized.slice(0, hashIndex) : sanitized;
  const afterHash = hashIndex >= 0 ? sanitized.slice(hashIndex) : "";
  const url = new URL(beforeHash, "https://local.invalid");
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length > 0 && routing.locales.includes(segments[0] as AppLocale)) {
    const rest = segments.slice(1);
    url.pathname = rest.length === 0 ? "/" : `/${rest.join("/")}`;
  }
  return url.pathname + url.search + afterHash;
}
