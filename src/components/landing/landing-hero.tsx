"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { LandingWhatsNew } from "@/components/landing/LandingWhatsNew";
import { cn } from "@/lib/utils";
import {
  APPLE_HERO_TITLE_CLASS,
  APPLE_LP_LINE_BREAK_CLASS,
  APPLE_BUTTON_PRIMARY_CLASS,
  APPLE_BUTTON_SECONDARY_CLASS,
  APPLE_SECTION_PADDING_CLASS,
  APPLE_CONTENT_WIDTH_CLASS,
} from "@/lib/ui/apple-design";
import { LP_SPRING } from "./landing-motion";

type LandingHeroProps = {
  primaryCtaHref: string;
  primaryCtaLabel: string;
  secondaryCtaHref: string;
  secondaryCtaLabel: string;
  isAuthenticated: boolean;
};

export function LandingHero({
  primaryCtaHref,
  primaryCtaLabel,
  secondaryCtaHref,
  secondaryCtaLabel,
  isAuthenticated,
}: LandingHeroProps) {
  const t = useTranslations("LandingV2");

  return (
    <div className={APPLE_CONTENT_WIDTH_CLASS}>
      <section className="pt-6">
        <LandingWhatsNew
          suppressForAuthenticatedSession={isAuthenticated}
        />
      </section>

      <section className={cn(APPLE_SECTION_PADDING_CLASS, "text-center")}>
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...LP_SPRING, delay: 0.05 }}
          >
            <Badge
              variant="outline"
              className="mb-7 border-[var(--apple-separator)] bg-[var(--apple-surface)] text-[10px] tracking-widest text-[var(--apple-text-secondary)] uppercase"
            >
              {t("hero.kicker")}
            </Badge>
          </motion.div>

          <motion.h1
            className={cn(APPLE_HERO_TITLE_CLASS, "mx-auto w-full")}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...LP_SPRING, delay: 0.2 }}
          >
            <span className="block font-medium text-[var(--apple-text-secondary)]">
              {t("hero.titleLine1")}
            </span>
            <span className="mt-2 block font-bold text-[var(--apple-text)]">
              {t("hero.titleLine2")}
            </span>
          </motion.h1>

          <motion.p
            className={cn(
              "mx-auto mt-8 w-full max-w-3xl text-base font-normal leading-[1.65] text-[var(--apple-text-secondary)] md:text-lg",
              APPLE_LP_LINE_BREAK_CLASS,
            )}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...LP_SPRING, delay: 0.4 }}
          >
            {t("hero.description")}
          </motion.p>

          <motion.div
            className="mt-12 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:items-center sm:justify-center"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...LP_SPRING, delay: 0.6 }}
          >
            <Link
              href={primaryCtaHref}
              className={cn(APPLE_BUTTON_PRIMARY_CLASS, "w-full sm:w-auto")}
            >
              {primaryCtaLabel}
            </Link>
            <Link
              href={secondaryCtaHref}
              className={cn(APPLE_BUTTON_SECONDARY_CLASS, "w-full sm:w-auto")}
            >
              {secondaryCtaLabel}
            </Link>
          </motion.div>

          <motion.p
            className={cn(
              "mx-auto mt-6 max-w-xl text-xs leading-[1.65] text-[var(--apple-text-secondary)]",
              APPLE_LP_LINE_BREAK_CLASS,
            )}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...LP_SPRING, delay: 0.65 }}
          >
            {t("hero.note")}
          </motion.p>
        </div>
      </section>
    </div>
  );
}
