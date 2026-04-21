function isValidTurnstileKey(value: string): boolean {
  return value.trim().length > 0;
}

export function getTurnstileSiteKey(): string {
  return (process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ?? "").trim();
}

export function getTurnstileSecretKey(): string {
  return (process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY ?? "").trim();
}

export function isTurnstileConfigured(): boolean {
  return (
    isValidTurnstileKey(getTurnstileSiteKey()) &&
    isValidTurnstileKey(getTurnstileSecretKey())
  );
}
