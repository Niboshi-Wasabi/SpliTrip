import {
  AUTH_ERROR,
  type AuthErrorCode,
  isAuthErrorCode,
} from "@/lib/auth/auth-error-codes";

const LINE_ENV_HINT =
  "LINE ログイン用の環境変数（LINE_CHANNEL_ID, LINE_CHANNEL_SECRET, NEXT_PUBLIC_LINE_REDIRECT_URI）が未設定です。.env.local を確認してください。";

/** `?error=` の値 → ログイン画面に表示する文言 */
export const LOGIN_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  [AUTH_ERROR.AUTH]: "認証に失敗しました。もう一度お試しください。",
  [AUTH_ERROR.LINE_CONFIG]: LINE_ENV_HINT,
  [AUTH_ERROR.LINE_AUTH]:
    "LINE ログインに失敗しました。Supabase の [Authentication] → [Providers] で LINE を有効化し、チャネル ID が .env の LINE_CHANNEL_ID と一致するか確認してください。",
  [AUTH_ERROR.CAPTCHA_REQUIRED]:
    "人間確認（Turnstile）を完了してから、もう一度お試しください。",
};

export function loginErrorMessageFromQueryParam(
  errorParam: string | null,
): string | null {
  if (!errorParam) return null;
  if (!isAuthErrorCode(errorParam)) return null;
  return LOGIN_ERROR_MESSAGES[errorParam];
}
