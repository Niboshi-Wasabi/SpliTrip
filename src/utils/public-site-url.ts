/**
 * OAuth の `redirectTo` 等に使う公開オリジン。
 * Vercel 本番・staging では `NEXT_PUBLIC_SITE_URL` を設定すると、
 * Supabase の許可 URL と一致させやすく、localhost に飛ぶ問題を防げます。
 */
export function getPublicSiteOrigin(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  if (raw) {
    try {
      return new URL(raw).origin;
    } catch {
      // fall through
    }
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}
