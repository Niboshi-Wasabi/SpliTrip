"use client";

/**
 * Persists `navigator.languages` into a cookie for edge middleware, and once aligns
 * the URL locale with the device when SSR missed it (first visit only).
 * デバイス言語を Cookie に載せ、初回のみ SSR と URL ロケールをデバイスに合わせる。
 */

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  SPLITRIP_DEVICE_LANGUAGE_TAGS_COOKIE_NAME,
  buildDeviceLanguageTagsCookieValue,
} from "@/lib/i18n/device-locale-cookie";
import {
  hasLocaleBootstrapCompleted,
  markLocaleBootstrapComplete,
} from "@/lib/i18n/device-locale-bootstrap-storage";
import { negotiateAppLocaleFromLanguageTags } from "@/lib/i18n/negotiate-app-locale";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function DeviceLocaleSync() {
  const activeLocale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const bootstrapStartedRef = useRef(false);

  useEffect(() => {
    const tagList = Array.from(
      navigator.languages?.length
        ? navigator.languages
        : [navigator.language],
    );
    const cookiePayload = buildDeviceLanguageTagsCookieValue(tagList);
    document.cookie = `${SPLITRIP_DEVICE_LANGUAGE_TAGS_COOKIE_NAME}=${cookiePayload}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  }, []);

  useEffect(() => {
    if (bootstrapStartedRef.current) {
      return;
    }
    bootstrapStartedRef.current = true;

    if (hasLocaleBootstrapCompleted()) {
      return;
    }

    const tagList = Array.from(
      navigator.languages?.length
        ? navigator.languages
        : [navigator.language],
    );
    const deviceLocale = negotiateAppLocaleFromLanguageTags(tagList);

    if (deviceLocale === activeLocale) {
      markLocaleBootstrapComplete();
      return;
    }

    markLocaleBootstrapComplete();
    router.replace(pathname, { locale: deviceLocale });
    router.refresh();
  }, [activeLocale, pathname, router]);

  return null;
}
