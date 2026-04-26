"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import {
  Banknote,
  Check,
  HandCoins,
  ImageUp,
  Languages,
  LayoutDashboard,
  Link2,
  Mountain,
  Plane,
  QrCode,
  Radio,
  Receipt,
  Scale,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogoMark } from "@/components/logo-mark";
import { UserAvatarMenu } from "@/components/user-avatar-menu";
import {
  extractAvatarUrl,
  extractDisplayName,
} from "@/lib/user-profile";
import { createClient } from "@/utils/supabase/client";

type LandingSessionState = {
  isAuthenticated: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
};

type LandingPageProps = {
  initialSession: LandingSessionState;
};

const useCaseCardIds = ["winterCamp", "abroad", "largeParty"] as const;

export function LandingPage({ initialSession }: LandingPageProps) {
  const t = useTranslations("LandingV2");
  const [sessionState, setSessionState] = useState<LandingSessionState>(
    initialSession,
  );

  useEffect(() => {
    const supabase = createClient();
    let isActive = true;

    const applySession = (nextSession: Awaited<
      ReturnType<typeof supabase.auth.getSession>
    >["data"]["session"]) => {
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

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: "easeOut" as const },
    },
  };
  const staggerContainer = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.06,
      },
    },
  };
  const cardHoverClass =
    "transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(255,255,255,0.04)]";

  const bentoCards = [
    { id: "roundingPolicies" as const, Icon: Scale },
    { id: "nextPayerHint" as const, Icon: HandCoins },
    { id: "oneTapRemittance" as const, Icon: Link2 },
    { id: "receiptStorage" as const, Icon: ImageUp },
    { id: "realtime" as const, Icon: Radio },
    { id: "dashboardSummary" as const, Icon: LayoutDashboard },
  ];

  const useCaseMeta: Record<
    (typeof useCaseCardIds)[number],
    { Icon: LucideIcon }
  > = {
    winterCamp: { Icon: Mountain },
    abroad: { Icon: Plane },
    largeParty: { Icon: UsersRound },
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-zinc-900 bg-zinc-950/85 backdrop-blur-md">
        <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="text-zinc-100">
            <LogoMark />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-zinc-300 lg:flex">
            <a
              href="#features"
              className="min-h-[44px] content-center transition hover:text-zinc-100"
            >
              {t("nav.features")}
            </a>
            <a
              href="#use-cases"
              className="min-h-[44px] content-center transition hover:text-zinc-100"
            >
              {t("nav.useCases")}
            </a>
            <a
              href="#details"
              className="min-h-[44px] content-center transition hover:text-zinc-100"
            >
              {t("nav.details")}
            </a>
            <a
              href="#pricing"
              className="min-h-[44px] content-center transition hover:text-zinc-100"
            >
              {t("nav.pricing")}
            </a>
          </nav>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link href="/dashboard">
                  <Button
                    variant="ghost"
                    className="min-h-[44px] text-zinc-200 hover:bg-zinc-900 hover:text-zinc-50"
                  >
                    {t("actions.dashboard")}
                  </Button>
                </Link>
                <UserAvatarMenu
                  displayName={sessionState.displayName ?? "User"}
                  avatarUrl={sessionState.avatarUrl}
                  isAdmin={sessionState.isAdmin}
                  variant="landing"
                  size="sm"
                  accountAriaLabel={t("actions.accountAria")}
                />
              </>
            ) : (
              <Link href="/login">
                <Button
                  variant="ghost"
                  className="min-h-[44px] text-zinc-200 hover:bg-zinc-900 hover:text-zinc-50"
                >
                  {t("actions.login")}
                </Button>
              </Link>
            )}
            <Badge
              variant="secondary"
              className="border border-zinc-700 bg-zinc-900 text-[10px] tracking-widest text-zinc-200 uppercase"
            >
              BETA
            </Badge>
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col px-4 pb-24 md:px-6">
        <motion.section
          className="flex flex-col items-center py-24 text-center md:py-32"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeUp}>
            <Badge
              variant="outline"
              className="mb-7 border-zinc-700 bg-zinc-900/70 text-[10px] tracking-widest text-zinc-300 uppercase"
            >
              {t("hero.kicker")}
            </Badge>
          </motion.div>
          <motion.h1
            className="max-w-5xl text-5xl leading-none tracking-tight font-medium md:text-7xl"
            variants={fadeUp}
            transition={{ duration: 0.75, ease: "easeOut" }}
          >
            <span className="block text-zinc-200">{t("hero.titleLine1")}</span>
            <span className="mt-1 block font-bold text-zinc-50">
              {t("hero.titleLine2")}
            </span>
          </motion.h1>
          <motion.p
            className="mt-8 max-w-3xl text-base leading-relaxed font-normal text-zinc-400 md:text-lg"
            variants={fadeUp}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            {t("hero.description")}
          </motion.p>
          <motion.div
            className="mt-12 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:max-w-none sm:w-auto sm:flex-row sm:items-center"
            variants={fadeUp}
            transition={{ duration: 0.65, ease: "easeOut" }}
          >
            <Link href={primaryCtaHref} className="w-full sm:w-auto">
              <Button
                size="lg"
                className="h-auto min-h-[44px] w-full rounded-full bg-zinc-50 px-10 py-3 text-zinc-900 hover:bg-zinc-200 sm:w-auto"
              >
                {primaryCtaLabel}
              </Button>
            </Link>
            <Link href={secondaryCtaHref} className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="h-auto min-h-[44px] w-full rounded-full border-zinc-600 bg-transparent px-8 py-3 text-zinc-100 hover:bg-zinc-900 sm:w-auto"
              >
                {secondaryCtaLabel}
              </Button>
            </Link>
          </motion.div>
          <motion.p
            className="mt-6 text-xs leading-relaxed text-zinc-500"
            variants={fadeUp}
          >
            {t("hero.note")}
          </motion.p>
        </motion.section>

        <motion.section
          id="features"
          className="border-t border-zinc-900 py-20 md:py-24"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
        >
          <motion.div className="mb-8" variants={fadeUp}>
            <h2 className="text-2xl font-bold leading-tight tracking-tight text-zinc-100 md:text-3xl">
              {t("bento.title")}
            </h2>
            <p className="mt-2 text-sm font-normal text-zinc-400">
              {t("bento.subtitle")}
            </p>
          </motion.div>
          <motion.div
            className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer}
          >
            {bentoCards.map(({ id, Icon }) => (
              <motion.div key={id} variants={fadeUp} className="h-full">
                <Card
                  className={`h-full min-h-0 border-zinc-800 bg-zinc-900/50 ${cardHoverClass}`}
                >
                  <CardContent className="flex h-full min-h-0 flex-col p-6">
                    <div className="mb-4 flex min-h-12 items-start gap-2">
                      <Icon
                        className="mt-0.5 h-5 w-5 shrink-0 text-zinc-300"
                        aria-hidden
                      />
                      <p className="line-clamp-2 text-left text-base font-semibold leading-tight tracking-tight text-zinc-100">
                        {t(`bento.items.${id}.title`)}
                      </p>
                    </div>
                    <p className="flex-1 text-pretty text-left text-sm leading-relaxed font-normal text-zinc-400">
                      {t(`bento.items.${id}.body`)}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        <motion.section
          id="use-cases"
          className="border-t border-zinc-900 py-20 md:py-24"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
        >
          <motion.div className="mb-8" variants={fadeUp}>
            <h2 className="text-2xl font-bold leading-tight tracking-tight text-zinc-100 md:text-3xl">
              {t("useCases.title")}
            </h2>
            <p className="mt-2 text-sm font-normal text-zinc-400">
              {t("useCases.subtitle")}
            </p>
          </motion.div>
          <motion.div
            className="grid items-stretch gap-5 md:grid-cols-3"
            variants={staggerContainer}
          >
            {useCaseCardIds.map((useCaseId) => {
              const { Icon } = useCaseMeta[useCaseId];
              return (
                <motion.div key={useCaseId} variants={fadeUp} className="h-full">
                  <Card
                    className={`h-full min-h-0 border-zinc-800 bg-zinc-900/50 ${cardHoverClass}`}
                  >
                    <CardContent className="flex h-full min-h-0 flex-col p-6">
                      <div className="mb-4 flex min-h-12 items-start gap-3">
                        <Icon
                          className="mt-0.5 h-6 w-6 shrink-0 text-zinc-300"
                          aria-hidden
                        />
                        <h3 className="text-left text-base font-semibold leading-tight tracking-tight text-zinc-100">
                          {t(`useCases.items.${useCaseId}.title`)}
                        </h3>
                      </div>
                      <p className="flex-1 text-pretty text-left text-sm leading-relaxed font-normal text-zinc-400">
                        {t(`useCases.items.${useCaseId}.body`)}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.section>

        <motion.section
          id="details"
          className="border-t border-zinc-900 py-20 md:py-24"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
        >
          <motion.h2
            className="text-2xl font-bold leading-tight tracking-tight text-zinc-100 md:text-3xl"
            variants={fadeUp}
          >
            {t("detailed.title")}
          </motion.h2>
          <motion.div
            className="mt-8 grid items-stretch gap-4 md:grid-cols-2"
            variants={staggerContainer}
          >
            <motion.div variants={fadeUp} className="h-full">
              <Card
                className={`h-full min-h-0 border-zinc-800 bg-zinc-900/40 ${cardHoverClass}`}
              >
                <CardContent className="flex h-full min-h-0 flex-col p-5">
                  <div className="mb-3 flex min-h-10 shrink-0 items-start gap-2 text-zinc-100">
                    <Languages className="mt-0.5 h-4 w-4 shrink-0 text-zinc-300" />
                    <p className="line-clamp-2 text-left font-medium leading-tight tracking-tight">
                      {t("detailed.items.global.title")}
                    </p>
                  </div>
                  <p className="flex-1 text-pretty text-left text-sm leading-relaxed font-normal text-zinc-400">
                    {t("detailed.items.global.body")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={fadeUp} className="h-full">
              <Card
                className={`h-full min-h-0 border-zinc-800 bg-zinc-900/40 ${cardHoverClass}`}
              >
                <CardContent className="flex h-full min-h-0 flex-col p-5">
                  <div className="mb-3 flex min-h-10 shrink-0 items-start gap-2 text-zinc-100">
                    <QrCode className="mt-0.5 h-4 w-4 shrink-0 text-zinc-300" />
                    <p className="line-clamp-2 text-left font-medium leading-tight tracking-tight">
                      {t("detailed.items.join.title")}
                    </p>
                  </div>
                  <p className="flex-1 text-pretty text-left text-sm leading-relaxed font-normal text-zinc-400">
                    {t("detailed.items.join.body")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={fadeUp} className="h-full">
              <Card
                className={`h-full min-h-0 border-zinc-800 bg-zinc-900/40 ${cardHoverClass}`}
              >
                <CardContent className="flex h-full min-h-0 flex-col p-5">
                  <div className="mb-3 flex min-h-10 shrink-0 items-start gap-2 text-zinc-100">
                    <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-zinc-300" />
                    <p className="line-clamp-2 text-left font-medium leading-tight tracking-tight">
                      {t("detailed.items.payment.title")}
                    </p>
                  </div>
                  <p className="flex-1 text-pretty text-left text-sm leading-relaxed font-normal text-zinc-400">
                    {t("detailed.items.payment.body")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={fadeUp} className="h-full">
              <Card
                className={`h-full min-h-0 border-zinc-800 bg-zinc-900/40 ${cardHoverClass}`}
              >
                <CardContent className="flex h-full min-h-0 flex-col p-5">
                  <div className="mb-3 flex min-h-10 shrink-0 items-start gap-2 text-zinc-100">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-zinc-300" />
                    <p className="line-clamp-2 text-left font-medium leading-tight tracking-tight">
                      {t("detailed.items.audit.title")}
                    </p>
                  </div>
                  <p className="flex-1 text-pretty text-left text-sm leading-relaxed font-normal text-zinc-400">
                    {t("detailed.items.audit.body")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </motion.section>

        <motion.section
          id="pricing"
          className="border-t border-zinc-900 py-20 md:py-24"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
        >
          <motion.h2
            className="text-2xl font-bold leading-tight tracking-tight text-zinc-100 md:text-3xl"
            variants={fadeUp}
          >
            {t("pricing.title")}
          </motion.h2>
          <motion.p
            className="mt-2 text-sm font-normal text-zinc-400"
            variants={fadeUp}
          >
            {t("pricing.subtitle")}
          </motion.p>
          <motion.div
            className="mt-8 grid items-stretch gap-5 md:grid-cols-2"
            variants={staggerContainer}
          >
            <motion.div variants={fadeUp} className="h-full min-h-0">
              <Card
                className={`h-full min-h-0 border-zinc-800 bg-zinc-900/50 ${cardHoverClass}`}
              >
                <CardContent className="flex h-full min-h-0 flex-col p-6">
                  <div className="mb-4 flex shrink-0 items-center justify-between">
                    <p className="text-xl font-semibold tracking-tight">
                      {t("pricing.free.title")}
                    </p>
                    <Badge
                      variant="outline"
                      className="border-zinc-700 bg-zinc-900 text-zinc-300"
                    >
                      {t("pricing.free.badge")}
                    </Badge>
                  </div>
                  <ul className="min-h-0 flex-1 space-y-3 text-left text-sm font-normal text-zinc-300">
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                      {t("pricing.free.items.groups")}
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                      {t("pricing.free.items.split")}
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={fadeUp} className="relative h-full min-h-0">
              <Card className="pointer-events-none h-full min-h-0 select-none border-zinc-700 bg-zinc-900/70 opacity-45 saturate-50">
                <CardContent className="flex h-full min-h-0 flex-col space-y-3 p-6">
                  <div className="flex shrink-0 items-center justify-between">
                    <p className="text-xl font-semibold tracking-tight text-zinc-200">
                      {t("pricing.pro.title")}
                    </p>
                    <Badge className="bg-zinc-50 text-zinc-900">
                      {t("pricing.pro.badge")}
                    </Badge>
                  </div>
                  <ul className="min-h-0 flex-1 space-y-3 text-left text-sm font-normal text-zinc-300">
                    <li className="flex items-start gap-2">
                      <Receipt className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                      {t("pricing.pro.items.export")}
                    </li>
                    <li className="flex items-start gap-2">
                      <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                      {t("pricing.pro.items.advanced")}
                    </li>
                  </ul>
                </CardContent>
              </Card>
              <div
                role="status"
                aria-live="polite"
                className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-zinc-950/75 p-4 text-center ring-1 ring-inset ring-zinc-600/30 md:p-6"
              >
                <Badge
                  variant="secondary"
                  className="border border-zinc-600 bg-zinc-900 text-[10px] tracking-widest text-zinc-200 uppercase"
                >
                  {t("pricing.proOverlay.badge")}
                </Badge>
                <p className="max-w-[16rem] text-sm font-semibold text-zinc-50 md:max-w-xs">
                  {t("pricing.proOverlay.title")}
                </p>
                <p className="max-w-[18rem] text-xs leading-relaxed text-zinc-400 md:max-w-sm">
                  {t("pricing.proOverlay.body")}
                </p>
              </div>
            </motion.div>
          </motion.div>
        </motion.section>

        <motion.section
          id="cta"
          className="border-t border-zinc-900 py-20 md:py-28"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.35 }}
          variants={staggerContainer}
        >
          <motion.div
            className="flex flex-col items-center rounded-2xl border border-zinc-800 bg-zinc-900/30 px-6 py-14 text-center md:px-12"
            variants={fadeUp}
          >
            <h2 className="max-w-2xl text-2xl leading-tight tracking-tight text-zinc-100 md:text-3xl">
              {t("closingCta.title")}
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-zinc-400">
              {t("closingCta.body")}
            </p>
            <motion.div
              className="mt-10 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:max-w-none sm:w-auto sm:flex-row"
              variants={staggerContainer}
            >
              <motion.div variants={fadeUp} className="w-full sm:w-auto">
                <Link href={primaryCtaHref} className="block w-full sm:inline-block">
                  <Button
                    size="lg"
                    className="h-auto min-h-[44px] w-full rounded-full bg-zinc-50 px-10 py-3 text-zinc-900 hover:bg-zinc-200 sm:min-w-[200px]"
                  >
                    {primaryCtaLabel}
                  </Button>
                </Link>
              </motion.div>
              <motion.div variants={fadeUp} className="w-full sm:w-auto">
                <Link
                  href={secondaryCtaHref}
                  className="block w-full sm:inline-block"
                >
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-auto min-h-[44px] w-full rounded-full border-zinc-600 bg-transparent px-8 py-3 text-zinc-100 hover:bg-zinc-900 sm:min-w-[200px]"
                  >
                    {secondaryCtaLabel}
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
            <p className="mt-6 text-xs text-zinc-500">{t("hero.note")}</p>
          </motion.div>
        </motion.section>
      </main>
    </div>
  );
}
