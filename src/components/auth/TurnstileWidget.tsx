"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Script from "next/script";
import { getTurnstileSiteKey } from "@/utils/turnstile/env";

declare global {
  interface Window {
    [key: string]: ((token: string) => void) | undefined;
  }
}

type Props = {
  onTokenChange: (token: string | null) => void;
};

export function TurnstileWidget({ onTokenChange }: Props) {
  const siteKey = getTurnstileSiteKey();
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const stableId = useId().replace(/[:]/g, "_");
  const callbackName = useMemo(
    () => `__splitripTurnstileCb_${stableId}`,
    [stableId],
  );
  const expiredCallbackName = useMemo(
    () => `__splitripTurnstileExpired_${stableId}`,
    [stableId],
  );
  const errorCallbackName = useMemo(
    () => `__splitripTurnstileErr_${stableId}`,
    [stableId],
  );

  useEffect(() => {
    if (!siteKey) {
      onTokenChange(null);
      return;
    }

    window[callbackName] = (token: string) => {
      onTokenChange(token);
    };
    window[expiredCallbackName] = () => {
      onTokenChange(null);
    };
    window[errorCallbackName] = () => {
      onTokenChange(null);
    };

    return () => {
      delete window[callbackName];
      delete window[expiredCallbackName];
      delete window[errorCallbackName];
    };
  }, [
    callbackName,
    errorCallbackName,
    expiredCallbackName,
    onTokenChange,
    siteKey,
  ]);

  if (!siteKey) {
    return null;
  }

  return (
    <>
      <Script
        id="cloudflare-turnstile-script"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onLoad={() => setIsScriptLoaded(true)}
      />
      {isScriptLoaded ? (
        <div
          className="cf-turnstile mx-auto"
          data-sitekey={siteKey}
          data-callback={callbackName}
          data-expired-callback={expiredCallbackName}
          data-error-callback={errorCallbackName}
          data-theme="auto"
        />
      ) : null}
    </>
  );
}
