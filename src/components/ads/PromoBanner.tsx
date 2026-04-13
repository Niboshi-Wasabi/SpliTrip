"use client";

/**
 * Non-intrusive promo placeholder for future affiliate / partner links.
 * Keeps layout ready without looking like a display ad (card tone, no flashy colors).
 * 将来のアフィリエイト・提携用プレースホルダー。広告っぽさを抑えたカードトーンで配置のみ。
 */

type Props = {
  /** When true (PRO), hide the promo slot entirely. */
  hidden?: boolean;
};

export function PromoBanner({ hidden = false }: Props) {
  if (hidden) {
    return null;
  }

  // Temporarily hide the promo slot as requested (commented-out implementation kept in git history).
  return null;
}
