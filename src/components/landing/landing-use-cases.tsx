"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Mountain, Plane, UsersRound, type LucideIcon } from "lucide-react";
import {
  APPLE_SECTION_TITLE_CLASS,
  APPLE_SECTION_PADDING_CLASS,
  APPLE_CONTENT_WIDTH_CLASS,
} from "@/lib/ui/apple-design";
import { cn } from "@/lib/utils";
import { LP_SPRING, LP_FADE_UP, LP_STAGGER } from "./landing-motion";

const USE_CASE_IDS = ["winterCamp", "abroad", "largeParty"] as const;

const USE_CASE_ICONS: Record<(typeof USE_CASE_IDS)[number], LucideIcon> = {
  winterCamp: Mountain,
  abroad: Plane,
  largeParty: UsersRound,
};

export function LandingUseCases() {
  const t = useTranslations("LandingV2");

  return (
    <motion.section
      id="use-cases"
      className={cn(APPLE_CONTENT_WIDTH_CLASS, APPLE_SECTION_PADDING_CLASS, "border-t border-[var(--apple-separator)]")}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={LP_STAGGER}
    >
      <motion.div className="mb-8" variants={LP_FADE_UP}>
        <h2 className={APPLE_SECTION_TITLE_CLASS}>
          {t("useCases.title")}
        </h2>
        <p className="mt-2 text-sm font-normal text-[var(--apple-text-secondary)]">
          {t("useCases.subtitle")}
        </p>
      </motion.div>

      <div className="grid items-stretch gap-5 md:grid-cols-3">
        {USE_CASE_IDS.map((useCaseId, useCaseIndex) => {
          const Icon = USE_CASE_ICONS[useCaseId];
          return (
            <motion.div
              key={useCaseId}
              className="h-full"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.12 }}
              transition={{ ...LP_SPRING, delay: useCaseIndex * 0.08 }}
            >
              <div className="flex h-full min-h-0 flex-col border p-6 lp-card transition-shadow duration-300 hover:shadow-lg">
                <div className="mb-4 flex min-h-12 items-start gap-3">
                  <Icon
                    className="mt-0.5 h-6 w-6 shrink-0 text-[var(--apple-text-secondary)]"
                    aria-hidden
                  />
                  <h3 className="text-left text-base font-semibold leading-tight tracking-tight text-[var(--apple-text)]">
                    {t(`useCases.items.${useCaseId}.title`)}
                  </h3>
                </div>
                <p className="flex-1 text-pretty text-left text-sm leading-relaxed font-normal text-[var(--apple-text-secondary)]">
                  {t(`useCases.items.${useCaseId}.body`)}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
