export const LINE_OAUTH_STATE_COOKIE = "line_oauth_state";
export const LINE_OAUTH_NONCE_COOKIE = "line_oauth_nonce";
/** JS がセットし /api/auth/line が読み取り、httpOnly の LINE_OAUTH_CAPTCHA_COOKIE に載せ替える */
export const LINE_CAPTCHA_BRIDGE_COOKIE = "line_captcha_bridge";
/** LINE コールバックで signInWithIdToken の captchaToken に渡す（httpOnly） */
export const LINE_OAUTH_CAPTCHA_COOKIE = "line_oauth_captcha";
