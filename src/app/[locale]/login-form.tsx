"use client";

/**
 * OAuth ログイン。文言は next-intl の `Login` 名前空間で管理する。
 */

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogoMark } from "@/components/logo-mark";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { localizedDashboardPath } from "@/lib/i18n/localized-paths";
import { createClient } from "@/utils/supabase/client";
import { isSupabaseConfigured } from "@/utils/supabase/env";
import { loginErrorMessageFromQueryParam } from "@/lib/auth/login-error-messages";
import { formatOAuthLoginError } from "@/lib/oauth-errors";
import { getPublicSiteOrigin } from "@/utils/public-site-url";
import type { Provider } from "@supabase/supabase-js";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { getTurnstileSiteKey } from "@/utils/turnstile/env";
import { verifyTurnstileTokenOnServer } from "@/lib/turnstile/verify-client";
import { LANDING_PAGE_BACKGROUND_CLASSNAME } from "@/constants/landing-background";

type LoginProvider = "google" | "line";
type LoadingAction = LoginProvider;
type EmailAuthMode = "signIn" | "signUp";

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
  icon: React.FC;
  buttonClassName: string;
}[] = [
  {
    id: "google",
    labelKey: "googleLogin",
    icon: GoogleIcon,
    buttonClassName:
      "w-full justify-center gap-3 text-base font-medium border border-[var(--apple-separator)] hover:bg-[var(--apple-fill-tertiary)] hover:text-[var(--apple-text)]",
  },
  {
    id: "line",
    labelKey: "lineLogin",
    icon: LineIcon,
    buttonClassName:
      "w-full justify-center gap-3 border-0 bg-[#06C755] text-base font-medium text-white hover:bg-[#05b34c]",
  },
];

type LoginFormProps = {
  /** メンテ中でもプロキシを通過する `/login/staff` 用。管理者向けの説明を出す。 */
  staffMaintenanceEntry?: boolean;
};

export function LoginForm({ staffMaintenanceEntry = false }: LoginFormProps) {
  const locale = useLocale();
  const translations = useTranslations("Login");
  const searchParams = useSearchParams();
  const [loadingAction, setLoadingAction] = useState<LoadingAction | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailAuthMode, setEmailAuthMode] = useState<EmailAuthMode>("signIn");
  const [emailActionBusy, setEmailActionBusy] = useState(false);
  const [emailAuthSuccess, setEmailAuthSuccess] = useState<string | null>(null);
  const [passwordResetBusy, setPasswordResetBusy] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const supabaseReady = isSupabaseConfigured();
  const isTurnstileEnabled = getTurnstileSiteKey().length > 0;

  const urlErrorMessage = useMemo(
    () => loginErrorMessageFromQueryParam(searchParams.get("error")),
    [searchParams],
  );

  useEffect(() => {
    setError(urlErrorMessage);
  }, [urlErrorMessage]);

  const dashboardPath = localizedDashboardPath(locale);

  async function handleLogin(provider: LoginProvider) {
    if (!isSupabaseConfigured()) {
      setError(translations("supabaseNotConfigured"));
      return;
    }

    setLoadingAction(provider);
    setError(urlErrorMessage);

    if (isTurnstileEnabled) {
      if (!turnstileToken) {
        setError(translations("captchaRequired"));
        setLoadingAction(null);
        return;
      }
      // Turnstile の siteverify はトークンを 1 回しか有効化しない。LINE は `/api/auth/line` でも検証するため
      // ここで先に verify すると同じトークンが 2 回目で必ず失敗し `?error=captcha` になる。Google だけ先に検証する。
      if (provider !== "line") {
        const isCaptchaValid = await verifyTurnstileTokenOnServer(turnstileToken);
        if (!isCaptchaValid) {
          setError(translations("captchaFailed"));
          setLoadingAction(null);
          return;
        }
      }
    }

    if (provider === "line") {
      const lineAuthPath = isTurnstileEnabled
        ? `/api/auth/line?cf_turnstile_token=${encodeURIComponent(turnstileToken ?? "")}`
        : "/api/auth/line";
      window.location.assign(lineAuthPath);
      return;
    }

    const supabase = createClient();
    const siteOrigin = getPublicSiteOrigin();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: provider as Provider,
      options: {
        redirectTo: `${siteOrigin}/auth/callback?next=${encodeURIComponent(dashboardPath)}`,
      },
    });

    if (authError) {
      setError(formatOAuthLoginError(authError));
      setLoadingAction(null);
    }
  }

  function validateEmailAuthInput(): boolean {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError(translations("emailRequired"));
      return false;
    }
    if (!password) {
      setError(translations("passwordRequired"));
      return false;
    }
    return true;
  }

  async function handleEmailAuthSubmit() {
    if (!isSupabaseConfigured()) {
      setError(translations("supabaseNotConfigured"));
      return;
    }
    if (!validateEmailAuthInput()) {
      return;
    }

    const supabase = createClient();
    setEmailActionBusy(true);
    setError(null);
    setEmailAuthSuccess(null);
    const normalizedEmail = email.trim();

    try {
      if (emailAuthMode === "signUp") {
        const { error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        setEmailAuthSuccess(translations("signUpSuccess"));
        setEmailAuthMode("signIn");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      window.location.assign(dashboardPath);
    } finally {
      setEmailActionBusy(false);
    }
  }

  async function handleForgotPassword() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError(translations("emailRequired"));
      return;
    }
    if (!isSupabaseConfigured()) {
      setError(translations("supabaseNotConfigured"));
      return;
    }

    setPasswordResetBusy(true);
    setError(null);
    setEmailAuthSuccess(null);
    const supabase = createClient();
    const siteOrigin = getPublicSiteOrigin();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      {
        redirectTo: `${siteOrigin}/login`,
      },
    );
    if (resetError) {
      setError(resetError.message);
      setPasswordResetBusy(false);
      return;
    }
    setEmailAuthSuccess(translations("passwordResetSent"));
    setPasswordResetBusy(false);
  }

  const authButtonsDisabled =
    !supabaseReady || loadingAction !== null || emailActionBusy || passwordResetBusy;

  return (
    <div
      className={`relative flex min-h-screen flex-col items-center justify-center px-4 pb-10 pt-14 ${LANDING_PAGE_BACKGROUND_CLASSNAME}`}
    >
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex items-center text-[var(--apple-text)]">
          <LogoMark className="text-4xl md:text-4xl" />
        </div>
        <p className="text-lg text-[var(--apple-text-secondary)]">{translations("tagline")}</p>
      </div>

      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {staffMaintenanceEntry
              ? translations("staffLoginTitle")
              : translations("title")}
          </CardTitle>
          <CardDescription>
            {staffMaintenanceEntry
              ? translations("staffLoginDescription")
              : translations("description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!supabaseReady && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-left text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
              {translations("supabaseNotConfigured")}
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-center text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}
          {emailAuthSuccess ? (
            <div className="rounded-md bg-emerald-50 p-3 text-center text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {emailAuthSuccess}
            </div>
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
                  variant="outline"
                  size="lg"
                  className={buttonClassName}
                  disabled={authButtonsDisabled}
                  onClick={() => void handleLogin(id)}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Icon />
                  )}
                  {translations(labelKey)}
                </Button>
              );
            },
          )}
          <div className="my-2 h-px w-full bg-border" />
          <div className="space-y-3">
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={translations("emailPlaceholder")}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={authButtonsDisabled}
            />
            <Input
              type="password"
              autoComplete={emailAuthMode === "signUp" ? "new-password" : "current-password"}
              placeholder={translations("passwordPlaceholder")}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={authButtonsDisabled}
            />
            <Button
              type="button"
              className="min-h-[44px] w-full"
              disabled={authButtonsDisabled}
              onClick={() => void handleEmailAuthSubmit()}
            >
              {emailActionBusy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : emailAuthMode === "signUp" ? (
                translations("createAccount")
              ) : (
                translations("emailLogin")
              )}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                className="text-[var(--apple-text-secondary)] underline underline-offset-4 hover:text-[var(--apple-text)]"
                onClick={() =>
                  setEmailAuthMode((currentMode) =>
                    currentMode === "signIn" ? "signUp" : "signIn",
                  )
                }
                disabled={authButtonsDisabled}
              >
                {emailAuthMode === "signIn"
                  ? translations("switchToCreateAccount")
                  : translations("switchToSignIn")}
              </button>
              <button
                type="button"
                className="text-[var(--apple-text-secondary)] underline underline-offset-4 hover:text-[var(--apple-text)]"
                onClick={() => void handleForgotPassword()}
                disabled={authButtonsDisabled}
              >
                {passwordResetBusy ? translations("sending") : translations("forgotPassword")}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-sm text-[var(--apple-text-secondary)]">
        {translations("termsPrivacyLead")}
        <Link
          href="/terms"
          className="underline underline-offset-4 hover:text-[var(--apple-link)]"
        >
          {translations("terms")}
        </Link>
        {translations("termsPrivacyJoin")}
        <Link
          href="/privacy"
          className="underline underline-offset-4 hover:text-[var(--apple-link)]"
        >
          {translations("privacy")}
        </Link>
        {translations("termsPrivacyTrail")}
      </p>
    </div>
  );
}
