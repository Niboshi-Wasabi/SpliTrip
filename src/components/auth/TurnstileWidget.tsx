"use client";

import { useEffect, useId, useRef, useState } from "react";
import Script from "next/script";
import { getTurnstileSiteKey } from "@/utils/turnstile/env";

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  remove: (widgetId: string) => void;
};

type TurnstileRenderOptions = {
  sitekey: string;
  callback?: (token: string) => void;
  "error-callback"?: () => void;
  "expired-callback"?: () => void;
  theme?: "light" | "dark" | "auto";
};

function getTurnstileApiFromWindow(): TurnstileApi | null {
  if (typeof window === "undefined") {
    return null;
  }
  const turnstile = (window as unknown as { turnstile?: TurnstileApi })
    .turnstile;
  if (
    !turnstile ||
    typeof turnstile.render !== "function" ||
    typeof turnstile.remove !== "function"
  ) {
    return null;
  }
  return turnstile;
}

const TURNSTILE_API_RETRY_FRAMES = 60;

type Props = {
  onTokenChange: (token: string | null) => void;
};

/**
 * Cloudflare Turnstile。以前は onLoad 後にだけ DOM を出しており、api.js の初回走査の後に
 * 挿入されるためコールバックが動かないケースがあった。公式のとおり
 * コンテナ上で `turnstile.render` を行う（動的描画用）。
 */
export function TurnstileWidget({ onTokenChange }: Props) {
  const siteKey = getTurnstileSiteKey();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const containerElementRef = useRef<HTMLDivElement>(null);
  const onTokenChangeRef = useRef(onTokenChange);
  const widgetIdRef = useRef<string | null>(null);
  const instanceId = useId().replace(/[:]/g, "_");

  useEffect(() => {
    onTokenChangeRef.current = onTokenChange;
  }, [onTokenChange]);

  useEffect(() => {
    if (!scriptLoaded || !siteKey) {
      return;
    }
    const container = containerElementRef.current;
    if (!container) {
      return;
    }

    let frameCount = 0;
    let cancelled = false;

    function mountOrRetry() {
      if (cancelled) {
        return;
      }
      const mountTarget = containerElementRef.current;
      if (!mountTarget) {
        return;
      }
      const turnstile = getTurnstileApiFromWindow();
      if (!turnstile) {
        frameCount += 1;
        if (frameCount < TURNSTILE_API_RETRY_FRAMES) {
          requestAnimationFrame(mountOrRetry);
        }
        return;
      }

      if (widgetIdRef.current) {
        turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }

      const widgetId = turnstile.render(mountTarget, {
        sitekey: siteKey,
        callback: (token: string) => {
          onTokenChangeRef.current(token);
        },
        "error-callback": () => {
          onTokenChangeRef.current(null);
        },
        "expired-callback": () => {
          onTokenChangeRef.current(null);
        },
        theme: "auto",
      });
      widgetIdRef.current = widgetId;
    }

    mountOrRetry();

    return () => {
      cancelled = true;
      const currentWidgetId = widgetIdRef.current;
      if (currentWidgetId) {
        const turnstile = getTurnstileApiFromWindow();
        if (turnstile) {
          turnstile.remove(currentWidgetId);
        }
        widgetIdRef.current = null;
      }
    };
  }, [scriptLoaded, siteKey]);

  if (!siteKey) {
    return null;
  }

  return (
    <>
      <Script
        id="cloudflare-turnstile-script"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onLoad={() => {
          setScriptLoaded(true);
        }}
      />
      <div
        ref={containerElementRef}
        className="mx-auto min-h-[65px] w-full"
        data-turnstile-container={instanceId}
      />
    </>
  );
}
