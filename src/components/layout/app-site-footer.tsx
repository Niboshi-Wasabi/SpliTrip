"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BETA_FEEDBACK_HREF } from "@/lib/beta-feedback-href";

export function AppSiteFooter() {
  const t = useTranslations("AppFooter");

  return (
    <footer className="mt-auto border-t border-border/60 bg-muted/20 py-3 text-center">
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <Link
          href="/status"
          className="min-h-[44px] inline-flex items-center text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          {t("systemStatusLink")}
        </Link>
        <a
          href={BETA_FEEDBACK_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[44px] inline-flex items-center text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          {t("betaBugReport")}
        </a>
      </div>
    </footer>
  );
}
