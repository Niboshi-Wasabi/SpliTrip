/**
 * サイドバー / モバイルBottomNav 共通のナビゲーション項目とアクティブ判定。
 * Shared navigation items and active-state logic for sidebar & mobile BottomNav.
 */

import type { LucideIcon } from "lucide-react";
import { Home, Settings, LogOut } from "lucide-react";

export type AuthNavItem = {
  href: string;
  /** i18n キー（`BottomNav.*` 名前空間内） */
  labelKey: string;
  icon: LucideIcon;
};

/** ログアウト専用。ナビ項目とは別扱い。 */
export const AUTH_NAV_LOGOUT_ITEM = {
  labelKey: "logout" as const,
  icon: LogOut,
};

/** サイドバー & モバイル BottomNav で共有するナビ項目 */
export const AUTH_NAV_ITEMS: AuthNavItem[] = [
  { href: "/dashboard", labelKey: "home", icon: Home },
  { href: "/settings", labelKey: "settings", icon: Settings },
];

/**
 * ロケールを取り除いたパスが、指定ナビ項目のパスに一致（前方一致）するかを判定。
 * `/dashboard` は `/dashboard` および `/dashboard/*` にマッチ。
 * `/settings` は `/settings` のみにマッチ（厳密一致）。
 */
export function isAuthNavItemActive(
  pathWithoutLocale: string,
  navItem: AuthNavItem,
): boolean {
  if (navItem.href === "/settings") {
    return pathWithoutLocale === "/settings";
  }
  return (
    pathWithoutLocale === navItem.href ||
    pathWithoutLocale.startsWith(`${navItem.href}/`)
  );
}
