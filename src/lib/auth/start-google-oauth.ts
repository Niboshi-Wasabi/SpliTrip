"use client";

/**
 * Shared Google OAuth start with in-app-browser cookie-jar hand-off.
 * IAB の Cookie ジャー分離を避ける Google OAuth 開始の共通処理。
 */

import type { Provider } from "@supabase/supabase-js";
import {
  buildGoogleOAuthContinueUrl,
  isOAuthHostileInAppBrowser,
  navigateToExternalBrowser,
  OAUTH_NEXT_QUERY_KEY,
  OAUTH_START_QUERY_KEY,
} from "@/lib/auth/in-app-browser";
import { sanitizeRedirectPath } from "@/lib/auth/sanitize-redirect-path";
import { formatOAuthLoginError } from "@/lib/oauth-errors";
import { createClient } from "@/utils/supabase/client";
import { getPublicSiteOrigin } from "@/utils/public-site-url";

export type GoogleOAuthStartResult =
  | { status: "redirecting" }
  | { status: "handed_off" }
  | { status: "blocked"; message: string }
  | { status: "error"; message: string };

const AUTO_START_SESSION_KEY = "splitrip_google_oauth_autostart";

/**
 * Start Google PKCE OAuth, escaping LINE/FB IAB first when needed.
 * 必要なら LINE/FB IAB から退避してから Google PKCE OAuth を開始する。
 */
export async function startGoogleOAuth(params: {
  redirectPath: string;
  /** When true, skip IAB hand-off (page already opened externally) / 外部起動済みなら IAB 回避を省略 */
  skipInAppBrowserHandOff?: boolean;
}): Promise<GoogleOAuthStartResult> {
  const redirectPath =
    sanitizeRedirectPath(params.redirectPath) ?? params.redirectPath;

  if (
    !params.skipInAppBrowserHandOff &&
    typeof window !== "undefined" &&
    isOAuthHostileInAppBrowser(window.navigator.userAgent)
  ) {
    const continueUrl = buildGoogleOAuthContinueUrl({
      currentAbsoluteUrl: window.location.href,
      redirectPath,
    });
    if (navigateToExternalBrowser(continueUrl)) {
      return { status: "handed_off" };
    }
    return {
      status: "blocked",
      message: "in_app_browser",
    };
  }

  const supabase = createClient();
  const siteOrigin = getPublicSiteOrigin();
  const { error: authError } = await supabase.auth.signInWithOAuth({
    provider: "google" as Provider,
    options: {
      redirectTo: `${siteOrigin}/auth/callback?next=${encodeURIComponent(redirectPath)}`,
    },
  });

  if (authError) {
    return { status: "error", message: formatOAuthLoginError(authError) };
  }

  return { status: "redirecting" };
}

/**
 * Read `?start_oauth=google` once (after external browser hand-off) and consume it.
 * 外部ブラウザ引き継ぎ後の `?start_oauth=google` を一度だけ読み取り消費する。
 */
export function consumeGoogleOAuthAutoStartFromLocation(): {
  shouldStart: boolean;
  redirectPath: string | null;
} {
  if (typeof window === "undefined") {
    return { shouldStart: false, redirectPath: null };
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get(OAUTH_START_QUERY_KEY) !== "google") {
    return { shouldStart: false, redirectPath: null };
  }

  if (isOAuthHostileInAppBrowser(window.navigator.userAgent)) {
    return { shouldStart: false, redirectPath: null };
  }

  if (window.sessionStorage.getItem(AUTO_START_SESSION_KEY) === "1") {
    return { shouldStart: false, redirectPath: null };
  }

  const redirectPath = sanitizeRedirectPath(params.get(OAUTH_NEXT_QUERY_KEY));
  window.sessionStorage.setItem(AUTO_START_SESSION_KEY, "1");

  params.delete(OAUTH_START_QUERY_KEY);
  params.delete(OAUTH_NEXT_QUERY_KEY);
  const nextSearch = params.toString();
  const nextUrl =
    window.location.pathname + (nextSearch ? `?${nextSearch}` : "") + window.location.hash;
  window.history.replaceState({}, "", nextUrl);

  return { shouldStart: true, redirectPath };
}

/** Clear one-shot auto-start lock after a finished attempt / 試行後にワンショット錠を外す */
export function clearGoogleOAuthAutoStartLock(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.removeItem(AUTO_START_SESSION_KEY);
}
