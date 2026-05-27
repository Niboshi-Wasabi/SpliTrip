"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  extractAvatarUrl,
  extractDisplayName,
} from "@/lib/user-profile";
import { createClient } from "@/utils/supabase/client";
import { LANDING_PAGE_BACKGROUND_CLASSNAME } from "@/constants/landing-background";
import { LandingHeader } from "./landing-header";
import { LandingHero } from "./landing-hero";
import { LandingFeatures } from "./landing-features";
import { LandingUseCases } from "./landing-use-cases";
import { LandingDetails } from "./landing-details";
import { LandingPricing } from "./landing-pricing";
import { LandingCta } from "./landing-cta";

type LandingSessionState = {
  isAuthenticated: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
};

type LandingPageProps = {
  initialSession: LandingSessionState;
};

export function LandingPage({ initialSession }: LandingPageProps) {
  const t = useTranslations("LandingV2");
  const [sessionState, setSessionState] =
    useState<LandingSessionState>(initialSession);

  useEffect(() => {
    const supabase = createClient();
    let isActive = true;

    const applySession = (
      nextSession: Awaited<
        ReturnType<typeof supabase.auth.getSession>
      >["data"]["session"],
    ) => {
      if (!nextSession?.user) {
        setSessionState({
          isAuthenticated: false,
          displayName: null,
          avatarUrl: null,
          isAdmin: false,
        });
        return;
      }
      void (async () => {
        const { data: roleRow } = await supabase
          .from("user_profiles")
          .select("is_admin")
          .eq("id", nextSession.user.id)
          .maybeSingle();
        if (!isActive) {
          return;
        }
        setSessionState({
          isAuthenticated: true,
          displayName: extractDisplayName(nextSession.user),
          avatarUrl: extractAvatarUrl(nextSession.user),
          isAdmin: roleRow?.is_admin === true,
        });
      })();
    };

    void supabase.auth.getSession().then(({ data }) => {
      if (!isActive) {
        return;
      }
      applySession(data.session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        applySession(nextSession);
      },
    );

    return () => {
      isActive = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const isAuthenticated = sessionState.isAuthenticated;
  const primaryCtaHref = isAuthenticated ? "/dashboard" : "/login";
  const primaryCtaLabel = isAuthenticated
    ? t("hero.ctaDashboard")
    : t("hero.cta");
  const secondaryCtaHref = "/dashboard/groups/new";
  const secondaryCtaLabel = t("hero.ctaSecondary");

  return (
    <div
      className={cn(
        LANDING_PAGE_BACKGROUND_CLASSNAME,
        "min-h-screen text-[var(--apple-text)]",
      )}
    >
      <LandingHeader
        isAuthenticated={isAuthenticated}
        displayName={sessionState.displayName}
        avatarUrl={sessionState.avatarUrl}
        isAdmin={sessionState.isAdmin}
      />

      <main className="pb-24">
        <LandingHero
          primaryCtaHref={primaryCtaHref}
          primaryCtaLabel={primaryCtaLabel}
          secondaryCtaHref={secondaryCtaHref}
          secondaryCtaLabel={secondaryCtaLabel}
          isAuthenticated={isAuthenticated}
        />
        <LandingFeatures />
        <LandingUseCases />
        <LandingDetails />
        <LandingPricing />
        <LandingCta
          primaryCtaHref={primaryCtaHref}
          primaryCtaLabel={primaryCtaLabel}
          secondaryCtaHref={secondaryCtaHref}
          secondaryCtaLabel={secondaryCtaLabel}
        />
      </main>
    </div>
  );
}
