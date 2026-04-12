import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PitchDeck } from "@/components/pitch/pitch-deck";
import { isAnonymousFromAuthState } from "@/lib/auth/is-supabase-anonymous-session";
import { sanitizeRedirectPath } from "@/lib/auth/sanitize-redirect-path";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Product pitch deck route.
 * プロダクト紹介スライド。`next` はログイン後リダイレクト用（サニタイズ済み）。
 */

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const pitchTranslations = await getTranslations("PitchDeck");
  return {
    title: pitchTranslations("metaTitle"),
    description: pitchTranslations("metaDescription"),
  };
}

export default async function PitchPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);

  const safeNextPath =
    sanitizeRedirectPath(typeof query.next === "string" ? query.next : null) ??
    "/dashboard";

  const supabase = await createClient();
  const [{ data: userData }, { data: sessionData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ]);
  const user = userData.user;
  const isAnonymous = isAnonymousFromAuthState({
    user,
    session: sessionData.session,
  });

  /** 匿名セッションは DB 変異不可のため閲覧完了の永続化は行わない（永続ユーザーだけ POST）。 */
  const shouldPersistCompletion = user !== null && !isAnonymous;

  return (
    <PitchDeck
      afterPitchPath={safeNextPath}
      shouldPersistCompletion={shouldPersistCompletion}
    />
  );
}
