/**
 * Helpers for invite / share links that may be opened inside LINE.
 * LINE 内で開かれる招待・共有リンク向けのヘルパー。
 */

import { withOpenExternalBrowserParam } from "@/lib/auth/in-app-browser";

/**
 * Prefer external browser when the link is opened from LINE chat.
 * LINE トークからの Open 時に外部ブラウザを優先する（Chrome ではパラメータは無害）。
 */
export function inviteUrlPreferExternalBrowser(absoluteInviteUrl: string): string {
  return withOpenExternalBrowserParam(absoluteInviteUrl);
}
