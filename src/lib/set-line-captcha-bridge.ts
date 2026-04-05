import { LINE_CAPTCHA_BRIDGE_COOKIE } from "@/lib/line-oauth-cookie-names";

/** LINE 認可へ進む直前に呼ぶ（/api/auth/line が読み取り httpOnly に載せ替える） */
export function setLineCaptchaBridgeCookie(token: string): void {
  if (typeof document === "undefined") return;
  const maxAge = 600;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  document.cookie = `${LINE_CAPTCHA_BRIDGE_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}
