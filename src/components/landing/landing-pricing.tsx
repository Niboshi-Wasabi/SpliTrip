"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Banknote, Check, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  APPLE_SECTION_TITLE_CLASS,
  APPLE_SECTION_PADDING_CLASS,
  APPLE_CONTENT_WIDTH_CLASS,
} from "@/lib/ui/apple-design";
import { cn } from "@/lib/utils";
import { LP_SPRING, LP_FADE_UP, LP_STAGGER } from "./landing-motion";

export function LandingPricing() {
  const t = useTranslations("LandingV2");

  return (
    <motion.section
      id="pricing"
      className={cn(APPLE_CONTENT_WIDTH_CLASS, APPLE_SECTION_PADDING_CLASS, "border-t border-[var(--apple-separator)]")}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={LP_STAGGER}
    >
      <motion.h2 className={APPLE_SECTION_TITLE_CLASS} variants={LP_FADE_UP}>
        {t("pricing.title")}
      </motion.h2>
      <motion.p
        className="mt-2 text-sm font-normal text-[var(--apple-text-secondary)]"
        variants={LP_FADE_UP}
      >
        {t("pricing.subtitle")}
      </motion.p>

      <div className="mt-8 grid items-stretch gap-5 md:grid-cols-2">
        {/* Free plan */}
        <motion.div
          className="h-full min-h-0"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={LP_SPRING}
        >
          <div className="flex h-full min-h-0 flex-col border p-6 lp-card transition-shadow duration-300 hover:shadow-lg">
            <div className="mb-4 flex shrink-0 items-center justify-between">
              <p className="text-xl font-semibold tracking-tight text-[var(--apple-text)]">
                {t("pricing.free.title")}
              </p>
              <Badge
                variant="outline"
                className="border-[var(--apple-separator)] bg-[var(--apple-surface)] text-[var(--apple-text-secondary)]"
              >
                {t("pricing.free.badge")}
              </Badge>
            </div>
            <ul className="min-h-0 flex-1 space-y-3 text-left text-sm font-normal text-[var(--apple-text-secondary)]">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--apple-link)]" />
                {t("pricing.free.items.groups")}
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--apple-link)]" />
                {t("pricing.free.items.split")}
              </li>
            </ul>
          </div>
        </motion.div>

        {/* Pro plan (coming soon overlay) */}
        <motion.div
          className="relative h-full min-h-0"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ ...LP_SPRING, delay: 0.06 }}
        >
          <div className="pointer-events-none flex h-full min-h-0 select-none flex-col space-y-3 border border-[var(--apple-separator)] rounded-[var(--lp-card-radius)] bg-[var(--apple-surface)] p-6 opacity-45 saturate-50">
            <div className="flex shrink-0 items-center justify-between">
              <p className="text-xl font-semibold tracking-tight text-[var(--apple-text)]">
                {t("pricing.pro.title")}
              </p>
              <Badge className="bg-[var(--apple-text)] text-[var(--apple-bg)]">
                {t("pricing.pro.badge")}
              </Badge>
            </div>
            <ul className="min-h-0 flex-1 space-y-3 text-left text-sm font-normal text-[var(--apple-text-secondary)]">
              <li className="flex items-start gap-2">
                <Receipt className="mt-0.5 h-4 w-4 shrink-0 text-[var(--apple-text-secondary)]" />
                {t("pricing.pro.items.export")}
              </li>
              <li className="flex items-start gap-2">
                <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-[var(--apple-text-secondary)]" />
                {t("pricing.pro.items.advanced")}
              </li>
            </ul>
          </div>
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-[var(--lp-card-radius)] bg-black/75 p-4 text-center ring-1 ring-inset ring-[var(--apple-separator)] md:p-6"
          >
            <Badge
              variant="secondary"
              className="border border-[var(--apple-separator)] bg-[var(--apple-surface)] text-[10px] tracking-widest text-[var(--apple-text-secondary)] uppercase"
            >
              {t("pricing.proOverlay.badge")}
            </Badge>
            <p className="max-w-[16rem] text-sm font-semibold text-[var(--apple-text)] md:max-w-xs">
              {t("pricing.proOverlay.title")}
            </p>
            <p className="max-w-[18rem] text-xs leading-relaxed text-[var(--apple-text-secondary)] md:max-w-sm">
              {t("pricing.proOverlay.body")}
            </p>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
