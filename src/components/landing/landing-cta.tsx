"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  APPLE_BUTTON_PRIMARY_CLASS,
  APPLE_BUTTON_SECONDARY_CLASS,
  APPLE_SECTION_PADDING_CLASS,
  APPLE_CONTENT_WIDTH_CLASS,
} from "@/lib/ui/apple-design";
import { LP_FADE_UP, LP_STAGGER } from "./landing-motion";

type LandingCtaProps = {
  primaryCtaHref: string;
  primaryCtaLabel: string;
  secondaryCtaHref: string;
  secondaryCtaLabel: string;
};

export function LandingCta({
  primaryCtaHref,
  primaryCtaLabel,
  secondaryCtaHref,
  secondaryCtaLabel,
}: LandingCtaProps) {
  const t = useTranslations("LandingV2");

  return (
    <motion.section
      id="cta"
      className={cn(APPLE_CONTENT_WIDTH_CLASS, APPLE_SECTION_PADDING_CLASS, "border-t border-[var(--apple-separator)]")}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.35 }}
      variants={LP_STAGGER}
    >
      <motion.div
        className="flex flex-col items-center rounded-[var(--lp-card-radius)] border border-[var(--apple-separator)] bg-[var(--apple-surface)]/50 px-6 py-14 text-center shadow-[var(--lp-soft-shadow)] backdrop-blur-sm md:px-12"
        variants={LP_FADE_UP}
      >
        <h2 className="max-w-2xl text-[40px] font-bold leading-[1.08] tracking-[-0.03em] text-[var(--apple-text)] md:text-[56px]">
          {t("closingCta.title")}
        </h2>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-[var(--apple-text-secondary)]">
          {t("closingCta.body")}
        </p>
        <div className="mt-10 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:w-auto sm:max-w-none sm:flex-row">
          <Link
            href={primaryCtaHref}
            className={cn(APPLE_BUTTON_PRIMARY_CLASS, "w-full sm:w-auto sm:min-w-[200px]")}
          >
            {primaryCtaLabel}
          </Link>
          <Link
            href={secondaryCtaHref}
            className={cn(APPLE_BUTTON_SECONDARY_CLASS, "w-full sm:w-auto sm:min-w-[200px]")}
          >
            {secondaryCtaLabel}
          </Link>
        </div>
        <p className="mt-6 text-xs text-[var(--apple-text-secondary)]">
          {t("hero.note")}
        </p>
      </motion.div>
    </motion.section>
  );
}
