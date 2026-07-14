/**
 * Detect OAuth-hostile in-app browsers and hand navigation to the system browser.
 * Google OAuth PKCE + cookie sessions must stay in one cookie jar; LINE/FB WebViews
 * often complete Google auth in a separate Custom Tab jar, so the IAB stays signed out.
 * Google OAuth の PKCE と Cookie セッションは同一 Cookie ジャーが必須。LINE/FB の WebView は
 * Custom Tab 側で認可が完了し IAB 側が未ログインのまま残ることがあるため先に外部ブラウザへ出す。
 */

export const OAUTH_START_QUERY_KEY = "start_oauth";
export const OAUTH_NEXT_QUERY_KEY = "oauth_next";
export const OPEN_EXTERNAL_BROWSER_QUERY_KEY = "openExternalBrowser";

/**
 * @param userAgent - `navigator.userAgent` / リクエストの User-Agent
 * @returns true when Google OAuth should not run inside this browser context
 */
export function isOAuthHostileInAppBrowser(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  // LINE in-app browser (IAB and/or Android WebView marker).
  // LINE アプリ内ブラウザ（IAB 表記、または Android WebView の wv マーカー）。
  if (ua.includes("line/") && (ua.includes("iab") || ua.includes("; wv)"))) {
    return true;
  }
  if (ua.includes("fban") || ua.includes("fbav") || ua.includes("instagram")) {
    return true;
  }
  return false;
}

/**
 * Append LINE's openExternalBrowser=1 (harmless in Chrome; honored by LINE IAB).
 * LINE の openExternalBrowser=1 を付与（Chrome では無視、LINE IAB では外部起動）。
 */
export function withOpenExternalBrowserParam(absoluteUrl: string): string {
  const parsed = new URL(absoluteUrl);
  parsed.searchParams.set(OPEN_EXTERNAL_BROWSER_QUERY_KEY, "1");
  return parsed.toString();
}

/**
 * Build a continue URL that auto-starts Google OAuth after landing in an external browser.
 * 外部ブラウザ着地後に Google OAuth を自動開始する継続 URL を作る。
 */
export function buildGoogleOAuthContinueUrl(params: {
  currentAbsoluteUrl: string;
  redirectPath: string;
}): string {
  const continueUrl = new URL(params.currentAbsoluteUrl);
  continueUrl.searchParams.set(OAUTH_START_QUERY_KEY, "google");
  continueUrl.searchParams.set(OAUTH_NEXT_QUERY_KEY, params.redirectPath);
  continueUrl.searchParams.set(OPEN_EXTERNAL_BROWSER_QUERY_KEY, "1");
  return continueUrl.toString();
}

/**
 * Navigate out of a hostile IAB into the system browser when possible.
 * 可能な場合は悪意のある IAB からシステムブラウザへ遷移する。
 *
 * @returns whether a navigation was initiated / 遷移を開始したか
 */
export function navigateToExternalBrowser(absoluteUrl: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const userAgent = window.navigator.userAgent;
  const externalUrl = withOpenExternalBrowserParam(absoluteUrl);

  if (/Line\//i.test(userAgent)) {
    window.location.assign(externalUrl);
    return true;
  }

  if (/Android/i.test(userAgent) && /; wv\)/i.test(userAgent)) {
    const withoutScheme = absoluteUrl.replace(/^https:\/\//i, "");
    window.location.assign(
      `intent://${withoutScheme}#Intent;scheme=https;action=android.intent.action.VIEW;end`,
    );
    return true;
  }

  // iOS generic WebViews rarely allow forcing Safari; caller should show a manual notice.
  // iOS の一般 WebView では Safari 強制が難しいため、呼び出し側で手動案内する。
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    window.location.assign(externalUrl);
    return true;
  }

  return false;
}

/**
 * True after an external hand-off still left the user inside a hostile IAB.
 * 外部遷移後も敵性 IAB 内に留まっているとき true。
 */
export function shouldShowInAppBrowserOAuthNotice(userAgent: string): boolean {
  return isOAuthHostileInAppBrowser(userAgent);
}
