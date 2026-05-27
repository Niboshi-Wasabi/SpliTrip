"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { LandingWhatsNew } from "@/components/landing/LandingWhatsNew";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  APPLE_HERO_TITLE_CLASS,
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

      <section className={cn(APPLE_SECTION_PADDING_CLASS, "text-center md:text-left")}>
        <div className="grid items-center gap-14 md:grid-cols-2 md:gap-12 lg:gap-16">
          <div className="flex flex-col items-center md:items-start">
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
              className={cn(APPLE_HERO_TITLE_CLASS, "max-w-5xl")}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...LP_SPRING, delay: 0.2 }}
            >
              <span className="block font-medium text-[var(--apple-text-secondary)]">
                {t("hero.titleLine1")}
              </span>
              <span className="mt-1 block font-bold text-[var(--apple-text)]">
                {t("hero.titleLine2")}
              </span>
            </motion.h1>

            <motion.p
              className="mt-8 max-w-3xl text-base font-normal leading-relaxed text-[var(--apple-text-secondary)] md:text-lg"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...LP_SPRING, delay: 0.4 }}
            >
              {t("hero.description")}
            </motion.p>

            <motion.div
              className="mt-12 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:items-center"
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
              className="mt-6 text-xs leading-relaxed text-[var(--apple-text-secondary)]"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...LP_SPRING, delay: 0.65 }}
            >
              {t("hero.note")}
            </motion.p>
          </div>

          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...LP_SPRING, delay: 0.8 }}
          >
            <div className="relative w-full max-w-[280px]">
              <div className="rounded-[2.25rem] border border-[var(--apple-separator)] bg-gradient-to-b from-[var(--apple-surface)] to-black p-3 shadow-2xl ring-1 ring-[var(--apple-separator)]">
                <div className="relative aspect-[1170/2532] w-full overflow-hidden rounded-[1.65rem] bg-black">
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
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
