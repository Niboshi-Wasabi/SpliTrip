"use client";

/**
 * Fallback notice when Google OAuth cannot safely run inside an in-app browser.
 * アプリ内ブラウザでは Google OAuth を安全に完結できないときの案内。
 */

import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  navigateToExternalBrowser,
  withOpenExternalBrowserParam,
} from "@/lib/auth/in-app-browser";

type Props = {
  /** Absolute URL to reopen in the system browser / システムブラウザで開き直す絶対 URL */
  continueUrl: string;
};

/**
 * @param props.continueUrl - Page URL that should continue login externally
 */
export function InAppBrowserOAuthNotice({ continueUrl }: Props) {
  const translations = useTranslations("Login");

  function handleOpenExternal() {
    const target = withOpenExternalBrowserParam(continueUrl);
    if (!navigateToExternalBrowser(target)) {
      window.location.assign(target);
    }
  }

  return (
    <div
      role="status"
      className="rounded-[16px] border border-[var(--apple-separator)] bg-[var(--apple-fill-tertiary)] px-4 py-3 text-sm text-[var(--apple-text)]"
    >
      <p className="leading-relaxed">{translations("inAppBrowserNotice")}</p>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-3 min-h-[44px] gap-2 rounded-full"
        onClick={handleOpenExternal}
      >
        <ExternalLink className="size-4" aria-hidden />
        {translations("openInExternalBrowser")}
      </Button>
    </div>
  );
}
