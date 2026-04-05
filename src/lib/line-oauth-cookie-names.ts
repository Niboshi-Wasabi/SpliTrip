export const LINE_OAUTH_STATE_COOKIE = "line_oauth_state";
export const LINE_OAUTH_NONCE_COOKIE = "line_oauth_nonce";
/** OAuth 完了後の遷移先（パスのみ、例 `/join/<token>`） */
export const LINE_OAUTH_RETURN_PATH_COOKIE = "line_oauth_return_path";
/** JS がセットし /api/auth/line が読み取り、httpOnly の LINE_OAUTH_CAPTCHA_COOKIE に載せ替える */
export const LINE_CAPTCHA_BRIDGE_COOKIE = "line_captcha_bridge";
/** LINE コールバックで signInWithIdToken の captchaToken に渡す（httpOnly） */
export const LINE_OAUTH_CAPTCHA_COOKIE = "line_oauth_captcha";
