"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button-variants";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { cn } from "@/lib/utils";
import {
  Brain,
  Check,
  Globe,
  Lightbulb,
  QrCode,
  ReceiptText,
  ScanLine,
  Send,
  SlidersHorizontal,
  Split,
  Wallet,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const fadeUpVariants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45 },
  },
};

const highlightFeatureConfig = [
  { key: "receiptAi" as const, icon: ScanLine },
  { key: "flexibleSplit" as const, icon: SlidersHorizontal },
  { key: "tapToPay" as const, icon: Wallet },
  { key: "nextPayer" as const, icon: Lightbulb },
  { key: "guestJoin" as const, icon: QrCode },
  { key: "global" as const, icon: Globe },
];

const coreFeatureConfig = [
  { key: "ai" as const, icon: Brain },
  { key: "split" as const, icon: Split },
  { key: "settlement" as const, icon: Send },
  { key: "export" as const, icon: ReceiptText },
];

const highlightAccentClasses = [
  {
    card: "border-sky-200/80 bg-sky-50/70 dark:border-sky-400/30 dark:bg-sky-500/10",
    icon: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200",
  },
  {
    card: "border-violet-200/80 bg-violet-50/70 dark:border-violet-400/30 dark:bg-violet-500/10",
    icon: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200",
  },
  {
    card: "border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-400/30 dark:bg-emerald-500/10",
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
  },
  {
    card: "border-amber-200/80 bg-amber-50/70 dark:border-amber-400/30 dark:bg-amber-500/10",
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
  },
  {
    card: "border-rose-200/80 bg-rose-50/70 dark:border-rose-400/30 dark:bg-rose-500/10",
    icon: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
  },
  {
    card: "border-cyan-200/80 bg-cyan-50/70 dark:border-cyan-400/30 dark:bg-cyan-500/10",
    icon: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-200",
  },
] as const;

const coreAccentClasses = [
  {
    card: "border-indigo-200/80 bg-indigo-50/60 dark:border-indigo-400/30 dark:bg-indigo-500/10",
    icon: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200",
  },
  {
    card: "border-teal-200/80 bg-teal-50/60 dark:border-teal-400/30 dark:bg-teal-500/10",
    icon: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-200",
  },
  {
    card: "border-fuchsia-200/80 bg-fuchsia-50/60 dark:border-fuchsia-400/30 dark:bg-fuchsia-500/10",
    icon: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-200",
  },
  {
    card: "border-lime-200/80 bg-lime-50/60 dark:border-lime-400/30 dark:bg-lime-500/10",
    icon: "bg-lime-100 text-lime-700 dark:bg-lime-500/20 dark:text-lime-200",
  },
] as const;

export function LandingPage() {
  const landingTranslations = useTranslations("Landing");

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <header className="border-b border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-md bg-primary/15 p-2 text-primary">
              <Image
                src="/icons/icon-192x192.png"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
                priority
              />
            </span>
            <p className="text-sm font-semibold text-foreground">SpliTrip</p>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main>
        <motion.section
          className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-14 text-center md:py-20"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.p
            variants={fadeUpVariants}
            className="mx-auto rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
          >
            {landingTranslations("hero.badge")}
          </motion.p>
          <motion.h1
            variants={fadeUpVariants}
            className="mx-auto max-w-3xl text-balance text-3xl font-bold leading-tight text-foreground md:text-5xl"
          >
            {landingTranslations("hero.title")}
          </motion.h1>
          <motion.p
            variants={fadeUpVariants}
            className="mx-auto max-w-2xl text-pretty text-sm text-muted-foreground md:text-base"
          >
            {landingTranslations("hero.description")}
          </motion.p>
          <motion.div
            variants={fadeUpVariants}
            className="flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link
              href="/login"
              className={cn(
                buttonVariants({ size: "lg" }),
                "min-h-[44px] w-full shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:w-auto",
              )}
            >
              {landingTranslations("hero.primaryCta")}
            </Link>
            <Link
              href="/pitch"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "min-h-[44px] w-full transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md sm:w-auto",
              )}
            >
              {landingTranslations("hero.secondaryCta")}
            </Link>
          </motion.div>
        </motion.section>

        <motion.section
          className="mx-auto w-full max-w-6xl px-4 pb-12 md:pb-16"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.h2
            variants={fadeUpVariants}
            className="mb-6 text-center text-2xl font-semibold text-foreground md:text-3xl"
          >
            {landingTranslations("features.highlightsHeading")}
          </motion.h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {highlightFeatureConfig.map((featureItem, featureIndex) => {
              const accentClass =
                highlightAccentClasses[
                  featureIndex % highlightAccentClasses.length
                ];
              return (
              <motion.article
                key={featureItem.key}
                variants={fadeUpVariants}
                className={cn(
                  "rounded-2xl border p-5 shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg",
                  accentClass.card,
                )}
              >
                <featureItem.icon
                  className={cn(
                    "mb-3 h-9 w-9 rounded-lg p-2",
                    accentClass.icon,
                  )}
                  aria-hidden
                />
                <h3 className="text-base font-semibold text-foreground">
                  {landingTranslations(
                    `features.highlights.${featureItem.key}.title`,
                  )}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {landingTranslations(
                    `features.highlights.${featureItem.key}.description`,
                  )}
                </p>
              </motion.article>
              );
            })}
          </div>
        </motion.section>

        <motion.section
          className="mx-auto w-full max-w-6xl px-4 pb-16 md:pb-20"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.h2
            variants={fadeUpVariants}
            className="mb-6 text-center text-2xl font-semibold text-foreground md:text-3xl"
          >
            {landingTranslations("features.heading")}
          </motion.h2>
          <div className="grid gap-4 md:grid-cols-2">
            {coreFeatureConfig.map((featureItem, featureIndex) => {
              const accentClass =
                coreAccentClasses[featureIndex % coreAccentClasses.length];
              return (
              <motion.article
                key={featureItem.key}
                variants={fadeUpVariants}
                className={cn(
                  "rounded-2xl border p-5 shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg",
                  accentClass.card,
                )}
              >
                <featureItem.icon
                  className={cn(
                    "mb-3 h-9 w-9 rounded-lg p-2",
                    accentClass.icon,
                  )}
                  aria-hidden
                />
                <h3 className="text-base font-semibold text-foreground">
                  {landingTranslations(`features.${featureItem.key}.title`)}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {landingTranslations(
                    `features.${featureItem.key}.description`,
                  )}
                </p>
              </motion.article>
              );
            })}
          </div>
        </motion.section>

        <motion.section
          className="mx-auto w-full max-w-6xl px-4 pb-16 md:pb-20"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.div variants={fadeUpVariants} className="mb-8 text-center">
            <h2 className="text-2xl font-semibold text-foreground md:text-3xl">
              {landingTranslations("pricing.heading")}
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
              {landingTranslations("pricing.subheading")}
            </p>
          </motion.div>
          <div className="grid gap-6 md:grid-cols-2 md:items-stretch">
            <motion.article
              variants={fadeUpVariants}
              className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {landingTranslations("pricing.free.badge")}
                </span>
                <h3 className="text-xl font-semibold text-foreground">
                  {landingTranslations("pricing.free.title")}
                </h3>
              </div>
              <ul className="flex flex-1 flex-col gap-3 text-sm text-muted-foreground">
                {(["bullet1", "bullet2", "bullet3", "bullet4"] as const).map(
                  (bulletKey) => (
                    <li key={bulletKey} className="flex gap-2">
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                        aria-hidden
                      />
                      <span>
                        {landingTranslations(`pricing.free.${bulletKey}`)}
                      </span>
                    </li>
                  ),
                )}
              </ul>
            </motion.article>
            <motion.article
              variants={fadeUpVariants}
              className="flex flex-col rounded-2xl border border-primary/25 bg-primary/5 p-6 shadow-md ring-1 ring-primary/15"
            >
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {landingTranslations("pricing.pro.badge")}
                </span>
                <h3 className="text-xl font-semibold text-foreground">
                  {landingTranslations("pricing.pro.title")}
                </h3>
              </div>
              <ul className="flex flex-1 flex-col gap-3 text-sm text-muted-foreground">
                {(["bullet1", "bullet2", "bullet3", "bullet4"] as const).map(
                  (bulletKey) => (
                    <li key={bulletKey} className="flex gap-2">
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                        aria-hidden
                      />
                      <span>
                        {landingTranslations(`pricing.pro.${bulletKey}`)}
                      </span>
                    </li>
                  ),
                )}
              </ul>
              <p className="mt-5 text-center text-xs text-muted-foreground">
                {landingTranslations("pricing.pro.priceNote")}
              </p>
            </motion.article>
          </div>
        </motion.section>

        <motion.section
          className="mx-auto w-full max-w-4xl px-4 pb-20"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
        >
          <motion.div
            variants={fadeUpVariants}
            className="rounded-2xl border border-primary/20 bg-primary/5 px-6 py-8 text-center"
          >
            <h2 className="text-2xl font-semibold text-foreground">
              {landingTranslations("cta.title")}
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
              {landingTranslations("cta.description")}
            </p>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-5 inline-flex min-h-[44px] shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg",
              )}
            >
              {landingTranslations("cta.button")}
            </Link>
          </motion.div>
        </motion.section>
      </main>
    </div>
  );
}
