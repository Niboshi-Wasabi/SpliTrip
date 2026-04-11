"use client";

/**
 * Guest (anonymous) users: link Google or LINE without losing trip data.
 * Supabase project must have **manual identity linking** enabled.
 */

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { localizedDashboardPath } from "@/lib/i18n/localized-paths";
import { formatOAuthLoginError } from "@/lib/oauth-errors";
import { getPublicSiteOrigin } from "@/utils/public-site-url";
import { createClient } from "@/utils/supabase/client";
import { isSupabaseConfigured } from "@/utils/supabase/env";

type LoadingProvider = "google" | "line" | null;

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function LineIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.271.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

export function GuestAccountLinkModal() {
  const locale = useLocale();
  const dashboardTranslations = useTranslations("Dashboard");
  const loginTranslations = useTranslations("Login");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<LoadingProvider>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const supabaseReady = isSupabaseConfigured();
  const authButtonsDisabled = !supabaseReady || loadingProvider !== null;

  async function handleGoogleLink() {
    if (!supabaseReady) {
      setErrorMessage(loginTranslations("supabaseNotConfigured"));
      return;
    }
    setLoadingProvider("google");
    setErrorMessage(null);

    const supabase = createClient();
    const siteOrigin = getPublicSiteOrigin();
    const dashboardPath = localizedDashboardPath(locale);
    const { error: linkError } = await supabase.auth.linkIdentity({
      provider: "google",
      options: {
        redirectTo: `${siteOrigin}/auth/callback?next=${encodeURIComponent(dashboardPath)}`,
      },
    });

    if (linkError) {
      setErrorMessage(formatOAuthLoginError(linkError));
      setLoadingProvider(null);
    }
  }

  function handleLineLink() {
    if (!supabaseReady) {
      setErrorMessage(loginTranslations("supabaseNotConfigured"));
      return;
    }
    setLoadingProvider("line");
    setErrorMessage(null);
    const dashboardPath = localizedDashboardPath(locale);
    window.location.assign(
      `/api/auth/line?intent=link&next=${encodeURIComponent(dashboardPath)}`,
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-[44px] shrink-0 border-amber-700/40 text-amber-950 hover:bg-amber-100 dark:border-amber-500/40 dark:text-amber-100 dark:hover:bg-amber-950/50"
        onClick={() => setDialogOpen(true)}
      >
        {dashboardTranslations("guestLinkAccountButton")}
      </Button>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dashboardTranslations("guestLinkModalTitle")}
            </DialogTitle>
            <DialogDescription>
              {dashboardTranslations("guestLinkModalDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {!supabaseReady && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-left text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                {loginTranslations("supabaseNotConfigured")}
              </div>
            )}
            {errorMessage ? (
              <div className="rounded-md bg-red-50 p-3 text-center text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
                {errorMessage}
              </div>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="lg"
              className={cn(
                "min-h-[44px] w-full justify-center gap-2 border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
              )}
              disabled={authButtonsDisabled}
              onClick={() => void handleGoogleLink()}
            >
              {loadingProvider === "google" ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : (
                <GoogleIcon />
              )}
              {loadingProvider === "google"
                ? dashboardTranslations("guestLinkBusy")
                : dashboardTranslations("guestLinkGoogleLabel")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-h-[44px] w-full justify-center gap-2 border-[#06C755]/40 bg-[#06C755] text-white hover:bg-[#05b34c] hover:text-white"
              disabled={authButtonsDisabled}
              onClick={() => handleLineLink()}
            >
              {loadingProvider === "line" ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : (
                <LineIcon />
              )}
              {loadingProvider === "line"
                ? dashboardTranslations("guestLinkBusy")
                : dashboardTranslations("guestLinkLineLabel")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
