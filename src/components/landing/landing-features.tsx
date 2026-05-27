"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  HandCoins,
  ImageUp,
  LayoutDashboard,
  Link2,
  Radio,
  Scale,
} from "lucide-react";
import {
  APPLE_SECTION_TITLE_CLASS,
  APPLE_SECTION_PADDING_CLASS,
  APPLE_CONTENT_WIDTH_CLASS,
} from "@/lib/ui/apple-design";
import { cn } from "@/lib/utils";
import { LP_SPRING, LP_FADE_UP, LP_STAGGER } from "./landing-motion";

const BENTO_CARDS = [
  { id: "roundingPolicies" as const, Icon: Scale },
  { id: "nextPayerHint" as const, Icon: HandCoins },
  { id: "oneTapRemittance" as const, Icon: Link2 },
  { id: "receiptStorage" as const, Icon: ImageUp },
  { id: "realtime" as const, Icon: Radio },
  { id: "dashboardSummary" as const, Icon: LayoutDashboard },
];

export function LandingFeatures() {
  const t = useTranslations("LandingV2");

  return (
    <motion.section
      id="features"
      className={cn(APPLE_CONTENT_WIDTH_CLASS, APPLE_SECTION_PADDING_CLASS, "border-t border-[var(--apple-separator)]")}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={LP_STAGGER}
    >
      <motion.div className="mb-8" variants={LP_FADE_UP}>
        <h2 className={APPLE_SECTION_TITLE_CLASS}>
          {t("bento.title")}
        </h2>
        <p className="mt-2 text-sm font-normal text-[var(--apple-text-secondary)]">
          {t("bento.subtitle")}
        </p>
      </motion.div>

      <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {BENTO_CARDS.map(({ id, Icon }, cardIndex) => (
          <motion.div
            key={id}
            className="h-full"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.12 }}
            transition={{ ...LP_SPRING, delay: cardIndex * 0.08 }}
          >
            <div className="flex h-full min-h-0 flex-col border p-6 lp-card transition-shadow duration-300 hover:shadow-lg">
              <div className="mb-4 flex min-h-12 items-start gap-2">
                <Icon
                  className="mt-0.5 h-5 w-5 shrink-0 text-[var(--apple-text-secondary)]"
                  aria-hidden
                />
                <p className="text-left text-base font-semibold leading-snug tracking-tight text-[var(--apple-text)]">
                  {t(`bento.items.${id}.title`)}
                </p>
              </div>
              <p className="flex-1 text-pretty text-left text-sm leading-relaxed font-normal text-[var(--apple-text-secondary)]">
                {t(`bento.items.${id}.body`)}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
