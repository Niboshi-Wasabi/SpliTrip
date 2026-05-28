"use client";

import { useTranslations } from "next-intl";
import { motion, type Variants } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { Badge } from "@/components/ui/badge";
import { LogoMark } from "@/components/logo-mark";

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: "easeOut" },
  },
};

const sectionVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

export function LandingHeader() {
  const tLandingV2 = useTranslations("LandingV2");
  const betaTranslations = useTranslations("Beta");

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3 text-zinc-100"
          aria-label="SpliTrip home"
        >
          <LogoMark className="truncate text-xl md:text-2xl" />
        </Link>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] font-bold tracking-widest text-zinc-200 uppercase"
            title={betaTranslations("badgeAria")}
          >
            {betaTranslations("badge")}
          </span>
          <Link href="/login">
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] border-zinc-600 bg-transparent text-zinc-100 hover:bg-zinc-900"
            >
              {tLandingV2("actions.login")}
            </Button>
          </Link>
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}

export function HeroSection() {
  const t = useTranslations("LandingV2");

  return (
    <motion.section
      className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 text-center md:py-24"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={sectionVariants}
    >
      <motion.div variants={fadeUpVariants}>
        <Badge
          variant="outline"
          className="border-zinc-700 bg-zinc-900/70 text-[10px] tracking-widest text-zinc-300 uppercase"
        >
          {t("hero.kicker")}
        </Badge>
      </motion.div>
      <motion.h1
        variants={fadeUpVariants}
        className="mx-auto max-w-4xl break-keep text-3xl font-medium leading-[1.12] tracking-tight text-zinc-200 [overflow-wrap:anywhere] md:text-5xl"
      >
        <span className="block text-zinc-200">{t("hero.titleLine1")}</span>
        <span className="mt-2 block font-bold text-zinc-50">
          {t("hero.titleLine2")}
        </span>
      </motion.h1>
      <motion.p
        variants={fadeUpVariants}
        className="mx-auto max-w-2xl break-keep text-sm leading-[1.65] text-zinc-400 [overflow-wrap:anywhere] md:text-base"
      >
        {t("hero.description")}
      </motion.p>
      <motion.div
        variants={fadeUpVariants}
        className="mx-auto flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:max-w-none sm:w-auto sm:flex-row"
      >
        <Link href="/login" className="w-full sm:w-auto">
          <Button
            size="lg"
            className="h-auto min-h-[44px] w-full rounded-full bg-zinc-50 px-10 text-zinc-900 hover:bg-zinc-200"
          >
            {t("hero.cta")}
          </Button>
        </Link>
        <Link href="/dashboard/groups/new" className="w-full sm:w-auto">
          <Button
            size="lg"
            variant="outline"
            className="h-auto min-h-[44px] w-full rounded-full border-zinc-600 bg-transparent px-8 text-zinc-100 hover:bg-zinc-900"
          >
            {t("hero.ctaSecondary")}
          </Button>
        </Link>
      </motion.div>
      <motion.p
        variants={fadeUpVariants}
        className="text-xs text-zinc-500"
      >
        {t("hero.note")}
      </motion.p>
    </motion.section>
  );
}
