"use client";

/**
 * 未ログイン向け招待: Google / LINE OAuth のみ（ゲスト匿名は廃止）。
 */

import { useState, type FC } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import type { Provider } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatOAuthLoginError } from "@/lib/oauth-errors";
import { localizedJoinPath } from "@/lib/i18n/localized-paths";
import { createClient } from "@/utils/supabase/client";
import { isSupabaseConfigured } from "@/utils/supabase/env";
import { getPublicSiteOrigin } from "@/utils/public-site-url";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { getTurnstileSiteKey } from "@/utils/turnstile/env";
import { verifyTurnstileTokenOnServer } from "@/lib/turnstile/verify-client";

type LoginProvider = "google" | "line";

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

const PROVIDER_CONFIG: {
  id: LoginProvider;
  labelKey: "googleLogin" | "lineLogin";
  icon: FC;
  buttonClassName: string;
}[] = [
  {
    id: "google",
    labelKey: "googleLogin",
    icon: GoogleIcon,
    buttonClassName:
      "w-full justify-center gap-3 text-base font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  },
  {
    id: "line",
    labelKey: "lineLogin",
    icon: LineIcon,
    buttonClassName:
      "w-full justify-center gap-3 border-0 bg-[#06C755] text-base font-medium text-white hover:bg-[#05b34c]",
  },
];

type Props = {
  /** Invite token string (UUID) / 招待トークン（UUID 文字列） */
  token: string;
};

export function JoinGate({ token }: Props) {
  const locale = useLocale();
  const translations = useTranslations("JoinGate");
  const tLogin = useTranslations("Login");
  const [loadingAction, setLoadingAction] = useState<LoginProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const supabaseReady = isSupabaseConfigured();
  const isTurnstileEnabled = getTurnstileSiteKey().length > 0;
  const joinPath = localizedJoinPath(locale, token);

  async function handleOAuthLogin(provider: LoginProvider) {
    if (!supabaseReady) {
      setError(tLogin("supabaseNotConfigured"));
      return;
    }

    setLoadingAction(provider);
    setError(null);

    if (isTurnstileEnabled) {
      if (!turnstileToken) {
        setError(tLogin("captchaRequired"));
        setLoadingAction(null);
        return;
      }
      // `login-form` と同様: Turnstile は 1 回限り。LINE は `/api/auth/line` 側で検証する（二重にすると 2 回目が常に失敗する）。
      if (provider !== "line") {
        const isCaptchaValid = await verifyTurnstileTokenOnServer(turnstileToken);
        if (!isCaptchaValid) {
          setError(tLogin("captchaFailed"));
          setLoadingAction(null);
          return;
        }
      }
    }

    if (provider === "line") {
      const next = encodeURIComponent(joinPath);
      const tokenQuery = isTurnstileEnabled
        ? `&cf_turnstile_token=${encodeURIComponent(turnstileToken ?? "")}`
        : "";
      window.location.assign(`/api/auth/line?next=${next}${tokenQuery}`);
      return;
    }

    const supabase = createClient();
    const siteOrigin = getPublicSiteOrigin();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: provider as Provider,
      options: {
        redirectTo: `${siteOrigin}/auth/callback?next=${encodeURIComponent(joinPath)}`,
      },
    });

    if (authError) {
      setError(formatOAuthLoginError(authError));
      setLoadingAction(null);
    }
  }

  const authButtonsDisabled = !supabaseReady || loadingAction !== null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{translations("title")}</CardTitle>
          <CardDescription>{translations("description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {isTurnstileEnabled ? (
            <TurnstileWidget onTokenChange={setTurnstileToken} />
          ) : null}

          {PROVIDER_CONFIG.map(
            ({ id, labelKey, icon: Icon, buttonClassName }) => {
              const isLoading = loadingAction === id;
              return (
                <Button
                  key={id}
                  type="button"
                  variant="outline"
                  size="lg"
                  className={buttonClassName}
                  disabled={authButtonsDisabled}
                  onClick={() => void handleOAuthLogin(id)}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
                  ) : (
                    <Icon />
                  )}
                  {tLogin(labelKey)}
                </Button>
              );
            },
          )}
        </CardContent>
      </Card>
    </div>
  );
}
