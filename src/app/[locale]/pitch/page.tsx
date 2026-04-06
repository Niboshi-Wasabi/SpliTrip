import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PitchDeck } from "@/components/pitch/pitch-deck";

/**
 * Product pitch deck route.
 * プロダクト紹介スライド。文言は messages の Pitch 名前空間、UI は PitchDeck。
 *
 * Path note: Spec examples may use app/pitch/page.tsx, but localized UI lives under app/[locale]/…
 * so next-intl, fonts, and html lang stay consistent.
 * URL は /pitch（既定ロケール）と /en/pitch（localePrefix: as-needed）。
 */

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const pitchTranslations = await getTranslations("Pitch");
  return {
    title: pitchTranslations("metaTitle"),
    description: pitchTranslations("metaDescription"),
  };
}

export default async function PitchPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PitchDeck />;
}
