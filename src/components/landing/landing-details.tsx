"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Languages, Link2, QrCode, ShieldCheck } from "lucide-react";
import {
  APPLE_SECTION_TITLE_CLASS,
  APPLE_SECTION_PADDING_CLASS,
  APPLE_CONTENT_WIDTH_CLASS,
} from "@/lib/ui/apple-design";
import { cn } from "@/lib/utils";
import { LP_SPRING, LP_FADE_UP, LP_STAGGER } from "./landing-motion";

const DETAIL_ENTRIES = [
  { slug: "global" as const, Icon: Languages },
  { slug: "join" as const, Icon: QrCode },
  { slug: "payment" as const, Icon: Link2 },
  { slug: "audit" as const, Icon: ShieldCheck },
];

export function LandingDetails() {
  const t = useTranslations("LandingV2");

  return (
    <motion.section
      id="details"
      className={cn(APPLE_CONTENT_WIDTH_CLASS, APPLE_SECTION_PADDING_CLASS, "border-t border-[var(--apple-separator)]")}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={LP_STAGGER}
    >
      <motion.div className="mb-8" variants={LP_FADE_UP}>
        <h2 className={APPLE_SECTION_TITLE_CLASS}>
          {t("detailed.title")}
        </h2>
        <p className="mt-2 text-sm font-normal text-[var(--apple-text-secondary)]">
          {t("detailed.subtitle")}
        </p>
      </motion.div>

      <div className="grid items-stretch gap-4 md:grid-cols-2">
        {DETAIL_ENTRIES.map(({ slug, Icon }, detailIndex) => (
          <motion.div
            key={slug}
            className="h-full"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.12 }}
            transition={{ ...LP_SPRING, delay: detailIndex * 0.08 }}
          >
            <div className="flex h-full min-h-0 flex-col border p-5 lp-card transition-shadow duration-300 hover:shadow-lg">
              <div className="mb-3 flex min-h-10 shrink-0 items-start gap-2 text-[var(--apple-text)]">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--apple-text-secondary)]" />
                <p className="line-clamp-2 text-left font-medium leading-tight tracking-tight">
                  {t(`detailed.items.${slug}.title`)}
                </p>
              </div>
              <p className="flex-1 text-pretty text-left text-sm leading-relaxed font-normal text-[var(--apple-text-secondary)]">
                {t(`detailed.items.${slug}.body`)}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
