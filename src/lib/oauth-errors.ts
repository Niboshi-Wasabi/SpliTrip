import type { AuthError } from "@supabase/supabase-js";

const PROVIDER_NOT_ENABLED_GUIDE =
  "Supabase ダッシュボードで、このログイン方法がまだ有効になっていません。" +
  "左メニュー [Authentication] → [Providers] を開き、使うプロバイダー（Google / LINE など）をオンにし、各サービスで発行したクライアント ID・シークレットを入力して保存してください。";

function parseApiBody(message: string): { errorCode?: string; msg?: string } {
  const trimmed = message.trim();
  if (!trimmed.startsWith("{")) return {};
  try {
    const parsed = JSON.parse(trimmed) as {
      error_code?: string;
      msg?: string;
      code?: string;
    };
    return {
      errorCode: parsed.error_code ?? parsed.code,
      msg: parsed.msg,
    };
  } catch {
    return {};
  }
}

/**
 * signInWithOAuth 失敗時にユーザー向けの説明文へ変換する
 */
export function formatOAuthLoginError(authError: AuthError): string {
  const message = authError.message ?? "";
  const { errorCode, msg } = parseApiBody(message);
  const combined = `${errorCode ?? ""} ${msg ?? ""} ${message}`.toLowerCase();

  if (
    errorCode === "validation_failed" ||
    combined.includes("not enabled") ||
    combined.includes("unsupported provider") ||
    combined.includes("provider is not enabled")
  ) {
    return PROVIDER_NOT_ENABLED_GUIDE;
  }

  if (msg) return msg;
  return message || "ログインに失敗しました。もう一度お試しください。";
}
