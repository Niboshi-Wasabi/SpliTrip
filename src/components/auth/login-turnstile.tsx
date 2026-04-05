"use client";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { forwardRef } from "react";
import { getTurnstileSiteKey } from "@/utils/turnstile-env";

type LoginTurnstileProps = {
  onTokenChange: (token: string | null) => void;
};

export const LoginTurnstile = forwardRef<
  TurnstileInstance | null,
  LoginTurnstileProps
>(function LoginTurnstile({ onTokenChange }, ref) {
  const siteKey = getTurnstileSiteKey();

  if (!siteKey) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-2 py-1">
      <Turnstile
        ref={ref}
        siteKey={siteKey}
        options={{ size: "flexible", theme: "light" }}
        onSuccess={(token) => onTokenChange(token)}
        onExpire={() => onTokenChange(null)}
        onError={() => onTokenChange(null)}
      />
    </div>
  );
});
