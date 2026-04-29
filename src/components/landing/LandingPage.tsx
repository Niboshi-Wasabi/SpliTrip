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
import { LandingWhatsNew } from "@/components/landing/LandingWhatsNew";
import { LANDING_PAGE_BACKGROUND_CLASSNAME } from "@/constants/landing-background";
import Image from "next/image";
import { cn } from "@/lib/utils";
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

const LP_SPRING = { type: "spring" as const, stiffness: 100, damping: 22 };

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: LP_SPRING,
  },
};

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

  const staggerContainer = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.06,
      },
    },
  };
  const cardSurfaceClass =
    "border-zinc-200/80 bg-white/85 shadow-sm transition-[box-shadow,transform] duration-300 hover:shadow-xl hover:shadow-zinc-950/25 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:shadow-zinc-950/40";

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

  const detailedCardEntries = [
    { slug: "global" as const, Icon: Languages },
    { slug: "join" as const, Icon: QrCode },
    { slug: "payment" as const, Icon: Link2 },
    { slug: "audit" as const, Icon: ShieldCheck },
  ];

  return (
    <div
      className={cn(
        LANDING_PAGE_BACKGROUND_CLASSNAME,
        "min-h-screen text-zinc-900 dark:text-zinc-100",
      )}
    >
      <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-background/80 backdrop-blur-md dark:border-zinc-900 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="text-zinc-900 dark:text-zinc-100">
            <LogoMark />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-zinc-600 dark:text-zinc-300 lg:flex">
            <a
              href="#features"
              className="min-h-[44px] content-center transition hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              {t("nav.features")}
            </a>
            <a
              href="#use-cases"
              className="min-h-[44px] content-center transition hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              {t("nav.useCases")}
            </a>
            <a
              href="#details"
              className="min-h-[44px] content-center transition hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              {t("nav.details")}
            </a>
            <a
              href="#pricing"
              className="min-h-[44px] content-center transition hover:text-zinc-900 dark:hover:text-zinc-100"
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
                    className="min-h-[44px] text-zinc-800 hover:bg-zinc-200/80 hover:text-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
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
                  className="min-h-[44px] text-zinc-800 hover:bg-zinc-200/80 hover:text-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                >
                  {t("actions.login")}
                </Button>
              </Link>
            )}
            <Badge
              variant="secondary"
              className="border border-zinc-400 bg-white/70 text-[10px] tracking-widest text-zinc-700 uppercase dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
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
        <section className="pt-6">
          <LandingWhatsNew
            suppressForAuthenticatedSession={isAuthenticated}
          />
        </section>
        <section className="py-20 text-center md:py-28 md:text-left">
          <div className="grid items-center gap-14 md:grid-cols-2 md:gap-12 lg:gap-16">
            <div className="flex flex-col items-center md:items-start">
              <motion.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...LP_SPRING, delay: 0.05 }}
              >
                <Badge
                  variant="outline"
                  className="mb-7 border-zinc-300 bg-white/60 text-[10px] tracking-widest text-zinc-600 uppercase dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300"
                >
                  {t("hero.kicker")}
                </Badge>
              </motion.div>
              <motion.h1
                className="max-w-5xl text-5xl font-medium leading-none tracking-tight text-zinc-900 md:text-7xl dark:text-zinc-100"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...LP_SPRING, delay: 0.2 }}
              >
                <span className="block text-zinc-700 dark:text-zinc-200">
                  {t("hero.titleLine1")}
                </span>
                <span className="mt-1 block font-bold text-zinc-950 dark:text-zinc-50">
                  {t("hero.titleLine2")}
                </span>
              </motion.h1>
              <motion.p
                className="mt-8 max-w-3xl text-base font-normal leading-relaxed text-zinc-600 md:text-lg dark:text-zinc-400"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...LP_SPRING, delay: 0.4 }}
              >
                {t("hero.description")}
              </motion.p>
              <motion.div
                className="mt-12 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:max-w-none sm:w-auto sm:flex-row sm:items-center"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...LP_SPRING, delay: 0.6 }}
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={LP_SPRING}
                  className="w-full sm:w-auto"
                >
                  <Link href={primaryCtaHref} className="block w-full sm:inline-block">
                    <Button
                      size="lg"
                      className="h-auto min-h-[44px] w-full rounded-full bg-zinc-950 px-10 py-3 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 sm:w-auto"
                    >
                      {primaryCtaLabel}
                    </Button>
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={LP_SPRING}
                  className="w-full sm:w-auto"
                >
                  <Link href={secondaryCtaHref} className="block w-full sm:inline-block">
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-auto min-h-[44px] w-full rounded-full border-zinc-400 bg-white/50 px-8 py-3 text-zinc-900 hover:bg-white/80 dark:border-zinc-600 dark:bg-transparent dark:text-zinc-100 dark:hover:bg-zinc-900 sm:w-auto"
                    >
                      {secondaryCtaLabel}
                    </Button>
                  </Link>
                </motion.div>
              </motion.div>
              <motion.p
                className="mt-6 text-xs leading-relaxed text-zinc-500 dark:text-zinc-500"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...LP_SPRING, delay: 0.65 }}
              >
                {t("hero.note")}
              </motion.p>
            </div>
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...LP_SPRING, delay: 0.8 }}
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 4.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="relative w-full max-w-[280px]"
              >
                <div className="rounded-[2.25rem] border border-zinc-300/90 bg-gradient-to-b from-zinc-100 to-zinc-200/90 p-3 shadow-2xl shadow-zinc-900/25 ring-1 ring-zinc-300/60 dark:border-zinc-700 dark:from-zinc-800 dark:to-zinc-950 dark:ring-zinc-800/70">
                  <div className="relative aspect-[1170/2532] w-full overflow-hidden rounded-[1.65rem] bg-zinc-950">
                    <Image
                      src="/icons/source-app-icon.png"
                      alt=""
                      fill
                      className="object-contain object-center p-[18%]"
                      sizes="280px"
                      priority
                    />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <motion.section
          id="features"
          className="border-t border-zinc-200 py-20 dark:border-zinc-900 md:py-24"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
        >
          <motion.div className="mb-8" variants={fadeUp}>
            <h2 className="text-2xl font-bold leading-tight tracking-tight text-zinc-900 md:text-3xl dark:text-zinc-100">
              {t("bento.title")}
            </h2>
            <p className="mt-2 text-sm font-normal text-zinc-600 dark:text-zinc-400">
              {t("bento.subtitle")}
            </p>
          </motion.div>
          <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {bentoCards.map(({ id, Icon }, cardIndex) => (
              <motion.div
                key={id}
                className="h-full"
                initial={{ opacity: 0, y: 36 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.12 }}
                transition={{ ...LP_SPRING, delay: cardIndex * 0.08 }}
                whileHover={{ y: -10, transition: LP_SPRING }}
              >
                <Card className={cn("h-full min-h-0", cardSurfaceClass)}>
                  <CardContent className="flex h-full min-h-0 flex-col p-6">
                    <div className="mb-4 flex min-h-12 items-start gap-2">
                      <Icon
                        className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500 dark:text-zinc-300"
                        aria-hidden
                      />
                      <p className="text-left text-base font-semibold leading-snug tracking-tight text-zinc-900 dark:text-zinc-100">
                        {t(`bento.items.${id}.title`)}
                      </p>
                    </div>
                    <p className="flex-1 text-pretty text-left text-sm leading-relaxed font-normal text-zinc-600 dark:text-zinc-400">
                      {t(`bento.items.${id}.body`)}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          id="use-cases"
          className="border-t border-zinc-200 py-20 dark:border-zinc-900 md:py-24"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
        >
          <motion.div className="mb-8" variants={fadeUp}>
            <h2 className="text-2xl font-bold leading-tight tracking-tight text-zinc-900 md:text-3xl dark:text-zinc-100">
              {t("useCases.title")}
            </h2>
            <p className="mt-2 text-sm font-normal text-zinc-600 dark:text-zinc-400">
              {t("useCases.subtitle")}
            </p>
          </motion.div>
          <div className="grid items-stretch gap-5 md:grid-cols-3">
            {useCaseCardIds.map((useCaseId, useCaseCardIndex) => {
              const { Icon } = useCaseMeta[useCaseId];
              return (
                <motion.div
                  key={useCaseId}
                  className="h-full"
                  initial={{ opacity: 0, y: 36 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.12 }}
                  transition={{ ...LP_SPRING, delay: useCaseCardIndex * 0.08 }}
                  whileHover={{ y: -10, transition: LP_SPRING }}
                >
                  <Card className={cn("h-full min-h-0", cardSurfaceClass)}>
                    <CardContent className="flex h-full min-h-0 flex-col p-6">
                      <div className="mb-4 flex min-h-12 items-start gap-3">
                        <Icon
                          className="mt-0.5 h-6 w-6 shrink-0 text-zinc-500 dark:text-zinc-300"
                          aria-hidden
                        />
                        <h3 className="text-left text-base font-semibold leading-tight tracking-tight text-zinc-900 dark:text-zinc-100">
                          {t(`useCases.items.${useCaseId}.title`)}
                        </h3>
                      </div>
                      <p className="flex-1 text-pretty text-left text-sm leading-relaxed font-normal text-zinc-600 dark:text-zinc-400">
                        {t(`useCases.items.${useCaseId}.body`)}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        <motion.section
          id="details"
          className="border-t border-zinc-200 py-20 dark:border-zinc-900 md:py-24"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
        >
          <motion.h2
            className="text-2xl font-bold leading-tight tracking-tight text-zinc-900 md:text-3xl dark:text-zinc-100"
            variants={fadeUp}
          >
            {t("detailed.title")}
          </motion.h2>
          <div className="mt-8 grid items-stretch gap-4 md:grid-cols-2">
            {detailedCardEntries.map(({ slug, Icon }, detailedCardIndex) => (
              <motion.div
                key={slug}
                className="h-full"
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.12 }}
                transition={{ ...LP_SPRING, delay: detailedCardIndex * 0.08 }}
                whileHover={{ y: -10, transition: LP_SPRING }}
              >
                <Card className={cn("h-full min-h-0", cardSurfaceClass)}>
                  <CardContent className="flex h-full min-h-0 flex-col p-5">
                    <div className="mb-3 flex min-h-10 shrink-0 items-start gap-2 text-zinc-900 dark:text-zinc-100">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-300" />
                      <p className="line-clamp-2 text-left font-medium leading-tight tracking-tight">
                        {t(`detailed.items.${slug}.title`)}
                      </p>
                    </div>
                    <p className="flex-1 text-pretty text-left text-sm leading-relaxed font-normal text-zinc-600 dark:text-zinc-400">
                      {t(`detailed.items.${slug}.body`)}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          id="pricing"
          className="border-t border-zinc-200 py-20 dark:border-zinc-900 md:py-24"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
        >
          <motion.h2
            className="text-2xl font-bold leading-tight tracking-tight text-zinc-900 md:text-3xl dark:text-zinc-100"
            variants={fadeUp}
          >
            {t("pricing.title")}
          </motion.h2>
          <motion.p
            className="mt-2 text-sm font-normal text-zinc-600 dark:text-zinc-400"
            variants={fadeUp}
          >
            {t("pricing.subtitle")}
          </motion.p>
          <div className="mt-8 grid items-stretch gap-5 md:grid-cols-2">
            <motion.div
              className="h-full min-h-0"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={LP_SPRING}
              whileHover={{ y: -10, transition: LP_SPRING }}
            >
              <Card
                className={cn("h-full min-h-0", cardSurfaceClass)}
              >
                <CardContent className="flex h-full min-h-0 flex-col p-6">
                  <div className="mb-4 flex shrink-0 items-center justify-between">
                    <p className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                      {t("pricing.free.title")}
                    </p>
                    <Badge
                      variant="outline"
                      className="border-zinc-300 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                    >
                      {t("pricing.free.badge")}
                    </Badge>
                  </div>
                  <ul className="min-h-0 flex-1 space-y-3 text-left text-sm font-normal text-zinc-700 dark:text-zinc-300">
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
            <motion.div
              className="relative h-full min-h-0"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ ...LP_SPRING, delay: 0.06 }}
            >
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
          </div>
        </motion.section>

        <motion.section
          id="cta"
          className="border-t border-zinc-200 py-20 dark:border-zinc-900 md:py-28"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.35 }}
          variants={staggerContainer}
        >
          <motion.div
            className="flex flex-col items-center rounded-2xl border border-zinc-200 bg-white/55 px-6 py-14 text-center shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/35 md:px-12"
            variants={fadeUp}
          >
            <h2 className="max-w-2xl text-2xl leading-tight tracking-tight text-zinc-900 md:text-3xl dark:text-zinc-100">
              {t("closingCta.title")}
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {t("closingCta.body")}
            </p>
            <div className="mt-10 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:max-w-none sm:w-auto sm:flex-row">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={LP_SPRING}
                className="w-full sm:w-auto"
              >
                <Link href={primaryCtaHref} className="block w-full sm:inline-block">
                  <Button
                    size="lg"
                    className="h-auto min-h-[44px] w-full rounded-full bg-zinc-950 px-10 py-3 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 sm:min-w-[200px]"
                  >
                    {primaryCtaLabel}
                  </Button>
                </Link>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={LP_SPRING}
                className="w-full sm:w-auto"
              >
                <Link
                  href={secondaryCtaHref}
                  className="block w-full sm:inline-block"
                >
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-auto min-h-[44px] w-full rounded-full border-zinc-400 bg-white/60 px-8 py-3 text-zinc-900 hover:bg-white dark:border-zinc-600 dark:bg-transparent dark:text-zinc-100 dark:hover:bg-zinc-900 sm:min-w-[200px]"
                  >
                    {secondaryCtaLabel}
                  </Button>
                </Link>
              </motion.div>
            </div>
            <p className="mt-6 text-xs text-zinc-500">{t("hero.note")}</p>
          </motion.div>
        </motion.section>
      </main>
    </div>
  );
}
