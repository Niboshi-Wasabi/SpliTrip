"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { localizedDashboardPath } from "@/lib/i18n/localized-paths";
import { createClient } from "@/utils/supabase/client";
import { isSupabaseConfigured } from "@/utils/supabase/env";

type GoogleCredentialResponse = {
  credential?: string;
};

type GooglePromptMomentNotification = {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  isDismissedMoment: () => boolean;
};

type GoogleAccountId = {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    cancel_on_tap_outside?: boolean;
    prompt_parent_id?: string;
  }) => void;
  prompt: (
    listener?: (notification: GooglePromptMomentNotification) => void,
  ) => void;
  cancel: () => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountId;
      };
    };
  }
}

type Props = {
  skipPrompt?: boolean;
};

const PROMPT_PARENT_ID = "google-one-tap-anchor";
const ONE_TAP_DISMISS_NOTICE_SESSION_KEY = "splitrip_one_tap_dismiss_notice_shown";

export function GoogleOneTap({ skipPrompt = false }: Props) {
  const locale = useLocale();
  const router = useRouter();
  const loginTranslations = useTranslations("Login");
  const hasInitializedRef = useRef(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (window.google?.accounts?.id) {
      setScriptLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (skipPrompt || hasInitializedRef.current || !scriptLoaded) {
      return;
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";
    if (clientId.length === 0) {
      return;
    }
    if (!isSupabaseConfigured()) {
      return;
    }

    let isActive = true;
    const supabase = createClient();
    const dashboardPath = localizedDashboardPath(locale);
    hasInitializedRef.current = true;

    async function initializeOneTap() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isActive || session) {
        return;
      }

      const googleId = window.google?.accounts?.id;
      if (!googleId) {
        hasInitializedRef.current = false;
        return;
      }

      googleId.initialize({
        client_id: clientId,
        cancel_on_tap_outside: false,
        prompt_parent_id: PROMPT_PARENT_ID,
        callback: async (response) => {
          const token = response.credential;
          if (!token) {
            setErrorMessage(loginTranslations("oneTapMissingCredential"));
            return;
          }

          const { error } = await supabase.auth.signInWithIdToken({
            provider: "google",
            token,
          });

          if (error) {
            console.error("[Google One Tap signInWithIdToken error]:", error);
            setErrorMessage(loginTranslations("oneTapAuthFailed"));
            return;
          }

          googleId.cancel();
          setErrorMessage(null);
          router.push(dashboardPath);
          router.refresh();
        },
      });

      googleId.prompt((notification) => {
        if (notification.isDismissedMoment()) {
          const alreadyShown =
            typeof window !== "undefined" &&
            window.sessionStorage.getItem(ONE_TAP_DISMISS_NOTICE_SESSION_KEY) ===
              "1";
          if (alreadyShown) {
            return;
          }
          window.sessionStorage.setItem(
            ONE_TAP_DISMISS_NOTICE_SESSION_KEY,
            "1",
          );
          setErrorMessage(loginTranslations("oneTapDismissed"));
        }
      });
    }

    void initializeOneTap();

    return () => {
      isActive = false;
      window.google?.accounts?.id.cancel();
    };
  }, [locale, loginTranslations, router, scriptLoaded, skipPrompt]);

  if (skipPrompt) {
    return null;
  }

  return (
    <>
      <Script
        id="google-one-tap-script"
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      <div
        id={PROMPT_PARENT_ID}
        className="pointer-events-none fixed right-3 top-3 z-[70] min-h-[44px] min-w-[44px] md:right-5 md:top-5"
      />
      {errorMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-3 top-20 z-[70] max-w-xs rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-100 md:right-5"
        >
          {errorMessage}
        </div>
      ) : null}
    </>
  );
}
