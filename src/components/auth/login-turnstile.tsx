"use client";

/**
 * Cloudflare Turnstile wrapper for login / join flows.
 * Cloudflare Turnstile のラッパー（ログイン・招待参加）。
 *
 * Why `size: "normal"` (not `flexible`): `flexible` depends on parent width; in some layouts
 * the widget can collapse or stay invisible with Managed / auto appearance. Fixed footprint is clearer.
 * 理由: `flexible` は親幅依存でレイアウトによっては領域が潰れ見えなくなることがあるため、固定サイズにする。
 *
 * Why `appearance: "always"`: avoids interaction-only hiding before the challenge runs.
 * 理由: `interaction-only` 相当で初回が非表示になりがちなため、常に枠を出す。
 */

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { forwardRef, useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { getTurnstileSiteKey } from "@/utils/turnstile-env";

type LoginTurnstileProps = {
  onTokenChange: (token: string | null) => void;
};

export const LoginTurnstile = forwardRef<
  TurnstileInstance | null,
  LoginTurnstileProps
>(function LoginTurnstile({ onTokenChange }, ref) {
  const t = useTranslations("Login");
  const siteKey = getTurnstileSiteKey();
  const [loadFailed, setLoadFailed] = useState(false);

  const handleSuccess = useCallback(
    (token: string) => {
      setLoadFailed(false);
      onTokenChange(token);
    },
    [onTokenChange],
  );

  const handleExpire = useCallback(() => {
    onTokenChange(null);
  }, [onTokenChange]);

  const handleError = useCallback(() => {
    setLoadFailed(true);
    onTokenChange(null);
  }, [onTokenChange]);

  const handleScriptError = useCallback(() => {
    setLoadFailed(true);
    onTokenChange(null);
  }, [onTokenChange]);

  if (!siteKey) {
    return null;
  }

  return (
    <div className="flex w-full flex-col items-center gap-2 py-1">
      {loadFailed ? (
        <p
          className="max-w-sm text-center text-sm text-destructive"
          role="alert"
        >
          {t("turnstileLoadFailed")}
        </p>
      ) : null}
      <div className="flex min-h-[65px] w-full max-w-[300px] justify-center">
        <Turnstile
          ref={ref}
          siteKey={siteKey}
          options={{
            size: "normal",
            theme: "auto",
            appearance: "always",
          }}
          scriptOptions={{
            appendTo: "body",
            onError: handleScriptError,
          }}
          onSuccess={handleSuccess}
          onExpire={handleExpire}
          onError={handleError}
        />
      </div>
    </div>
  );
});

LoginTurnstile.displayName = "LoginTurnstile";
