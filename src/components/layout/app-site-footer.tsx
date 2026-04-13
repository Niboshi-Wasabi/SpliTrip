"use client";

import { useTranslations } from "next-intl";
import { BETA_FEEDBACK_HREF } from "@/lib/beta-feedback-href";

export function AppSiteFooter() {
  const t = useTranslations("AppFooter");

  return (
    <footer className="mt-auto border-t border-border/60 bg-muted/20 py-3 text-center">
      <a
        href={BETA_FEEDBACK_HREF}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        {t("betaBugReport")}
      </a>
    </footer>
  );
}
