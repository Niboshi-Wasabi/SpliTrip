/**
 * Builds pathname strings for default vs prefixed locales (`localePrefix: 'as-needed'`).
 * `localePrefix: as-needed` 向けに、既定ロケールとプレフィックス付きを切り替える。
 */
import { routing } from "@/i18n/routing";

/**
 * @param locale - Active locale / 現在のロケール
 * @param path - Absolute path starting with `/` / `/` で始まるパス
 * @returns Path with optional `/{locale}` prefix / 必要なら `/{locale}` を付与したパス
 */
export function withLocalePrefix(locale: string, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (locale === routing.defaultLocale) {
    return normalized;
  }
  return `/${locale}${normalized}`;
}

/**
 * @param locale - Active locale / 現在のロケール
 * @returns Dashboard path for that locale / ダッシュボードのパス
 */
export function localizedDashboardPath(locale: string): string {
  return withLocalePrefix(locale, "/dashboard");
}

/**
 * @param locale - Active locale / 現在のロケール
 * @param token - Invite UUID / 招待 UUID
 * @returns Join page path / 参加ページのパス
 */
export function localizedJoinPath(locale: string, token: string): string {
  return withLocalePrefix(locale, `/join/${token}`);
}

/**
 * Invite success / public alias: `/groups/[id]` (rewritten per locale by middleware).
 * 招待成功後のショート URL（`[locale]/groups/[id]` のエイリアス）。
 */
export function localizedGroupPublicPath(
  locale: string,
  groupId: string,
): string {
  return withLocalePrefix(locale, `/groups/${groupId}`);
}
