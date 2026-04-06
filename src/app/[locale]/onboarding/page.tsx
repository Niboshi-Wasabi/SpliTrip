export const dynamic = "force-dynamic";

import { redirect } from "@/i18n/navigation";
import { createClient } from "@/utils/supabase/server";
import {
  extractDisplayName,
  checkNeedsOnboarding,
  getMandatoryPitchHref,
} from "@/lib/user-profile";
import { OnboardingForm } from "./onboarding-form";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
};

export default async function OnboardingPage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const { next: rawNext } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/", locale });
    return;
  }

  const needsSetup = await checkNeedsOnboarding(supabase);
  const nextPath =
    typeof rawNext === "string" && rawNext.startsWith("/")
      ? rawNext
      : "/dashboard";

  const pitchHref = await getMandatoryPitchHref(supabase, nextPath);
  if (pitchHref) {
    redirect({ href: pitchHref, locale });
    return;
  }

  if (!needsSetup) {
    redirect({ href: nextPath, locale });
    return;
  }

  const suggestedName = extractDisplayName(user);
  const isOAuthUser =
    suggestedName !== "ユーザー" && suggestedName.length > 0;

  return (
    <OnboardingForm
      suggestedName={isOAuthUser ? suggestedName : ""}
      nextPath={nextPath}
    />
  );
}
