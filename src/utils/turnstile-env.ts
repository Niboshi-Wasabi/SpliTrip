/** Cloudflare Turnstile（公開サイトキー）。未設定ならウィジェットなし・Captcha 必須もスキップ。 */
export function getTurnstileSiteKey(): string {
  return (process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ?? "").trim();
}

export function isTurnstileConfigured(): boolean {
  return getTurnstileSiteKey().length > 0;
}
