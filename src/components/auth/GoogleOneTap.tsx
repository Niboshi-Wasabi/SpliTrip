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

type GoogleAccountId = {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    cancel_on_tap_outside?: boolean;
    use_fedcm_for_prompt?: boolean;
    itp_support?: boolean;
    context?: "signin" | "signup" | "use";
    color_scheme?: "default" | "filled_blue" | "filled_black";
  }) => void;
  prompt: () => void;
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
  redirectOnSuccess?: boolean;
};

function isLocalhostHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function shouldEnableGoogleOneTap(clientId: string): boolean {
  if (clientId.length === 0 || typeof window === "undefined") {
    return false;
  }

  const forceEnableOnLocalhost =
    (process.env.NEXT_PUBLIC_GOOGLE_ONE_TAP_ON_LOCALHOST ?? "").trim() === "true";

  if (
    process.env.NODE_ENV !== "production" &&
    isLocalhostHost(window.location.hostname) &&
    !forceEnableOnLocalhost
  ) {
    return false;
  }

  return true;
}

export function GoogleOneTap({
  skipPrompt = false,
  redirectOnSuccess = false,
}: Props) {
  const locale = useLocale();
  const router = useRouter();
  const loginTranslations = useTranslations("Login");
  const hasInitializedRef = useRef(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";
  const oneTapEnabled = shouldEnableGoogleOneTap(clientId);
  const [scriptLoaded, setScriptLoaded] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return oneTapEnabled && Boolean(window.google?.accounts?.id);
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (skipPrompt || hasInitializedRef.current || !scriptLoaded) {
      return;
    }

    if (!oneTapEnabled) {
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
        use_fedcm_for_prompt: true,
        itp_support: true,
        context: "signin",
        color_scheme: "filled_black",
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
          if (redirectOnSuccess) {
            router.push(dashboardPath);
          }
          router.refresh();
        },
      });

      googleId.prompt();
    }

    void initializeOneTap();

    return () => {
      isActive = false;
      window.google?.accounts?.id.cancel();
    };
  }, [
    clientId,
    locale,
    loginTranslations,
    oneTapEnabled,
    redirectOnSuccess,
    router,
    scriptLoaded,
    skipPrompt,
  ]);

  if (skipPrompt || !oneTapEnabled) {
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
