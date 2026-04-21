/**
 * ログイン画面へリダイレクトするときの `?error=` 値（サーバー・クライアントで共有）
 */
export const AUTH_ERROR = {
  AUTH: "auth",
  LINE_AUTH: "line_auth",
  LINE_CONFIG: "line_config",
  CAPTCHA: "captcha",
} as const;

export type AuthErrorCode = (typeof AUTH_ERROR)[keyof typeof AUTH_ERROR];

export function isAuthErrorCode(value: string): value is AuthErrorCode {
  return Object.values(AUTH_ERROR).includes(value as AuthErrorCode);
}

/** 例: `/?error=line_auth` */
export function loginErrorPath(code: AuthErrorCode): string {
  return `/?error=${code}`;
}
