/**
 * Freemium / PRO gating. DB: `user_profiles.premium_access`, `ocr_usage_count`, `premium_access_source`.
 * フリーミアムと PRO の判定（PRO 判定は premium_access のみ）。
 */

/** Free tier: Gemini OCR runs allowed before this count is reached (each successful parse increments). */
export const FREE_OCR_LIMIT = 3;

export type PremiumProfileFields = {
  premium_access?: boolean | null;
  ocr_usage_count?: number | null;
};

export function hasPremiumAccess(
  profile: PremiumProfileFields | null | undefined,
): boolean {
  return profile?.premium_access === true;
}

/**
 * Remaining free OCR attempts. Returns `null` when PRO (unlimited).
 * 無料枠の残り回数。PRO は `null`（無制限）。
 */
export function remainingFreeOcrUses(
  profile: PremiumProfileFields | null | undefined,
): number | null {
  if (hasPremiumAccess(profile)) {
    return null;
  }
  const used = profile?.ocr_usage_count ?? 0;
  return Math.max(0, FREE_OCR_LIMIT - used);
}

export function isOcrBlockedForFreeTier(
  profile: PremiumProfileFields | null | undefined,
): boolean {
  if (hasPremiumAccess(profile)) {
    return false;
  }
  return (profile?.ocr_usage_count ?? 0) >= FREE_OCR_LIMIT;
}
