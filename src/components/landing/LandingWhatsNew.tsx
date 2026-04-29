"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  WhatsNewModal,
  type WhatsNewAnnouncement,
} from "@/components/ui/WhatsNewModal";
import { Badge } from "@/components/ui/badge";
import type { AppLocale } from "@/i18n/routing";
import { useLocale } from "next-intl";

const LP_WHATSNEW_DISMISS_STORAGE_KEY = "splitrip_landing_whats_new_dismissed_id";

type PublicAnnouncementApiRow = {
  id: string;
  title_ja: string;
  title_en: string;
  content_ja: string;
  content_en: string;
  icon_type: string | null;
};

type LandingWhatsNewProps = {
  /** ログイン時はレイアウト側の What's New と二重になり得るためバナーを出さない。 */
  suppressForAuthenticatedSession: boolean;
};

export function LandingWhatsNew({
  suppressForAuthenticatedSession,
}: LandingWhatsNewProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("LandingV2");
  const [latestRow, setLatestRow] = useState<PublicAnnouncementApiRow | null>(null);
  const [loadDone, setLoadDone] = useState(false);
  const [storedDismissId, setStoredDismissId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    try {
      setStoredDismissId(
        typeof window !== "undefined"
          ? window.localStorage.getItem(LP_WHATSNEW_DISMISS_STORAGE_KEY)
          : null,
      );
    } catch {
      setStoredDismissId(null);
    }
  }, []);

  useEffect(() => {
    async function loadLatestAnnouncement() {
      try {
        const response = await fetch("/api/public/announcements", {
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as {
          ok?: boolean;
          items?: PublicAnnouncementApiRow[];
        };
        if (!payload.ok || !Array.isArray(payload.items) || payload.items.length === 0) {
          setLatestRow(null);
          return;
        }
        setLatestRow(payload.items[0] ?? null);
      } finally {
        setLoadDone(true);
      }
    }
    void loadLatestAnnouncement();
  }, []);

  const dismissedMatch =
    typeof storedDismissId === "string" &&
    typeof latestRow?.id === "string" &&
    storedDismissId === latestRow.id;

  const announcementForModal: WhatsNewAnnouncement | null = useMemo(() => {
    if (!latestRow?.id) {
      return null;
    }
    return {
      id: latestRow.id,
      title:
        locale === "en" ? latestRow.title_en : latestRow.title_ja,
      content:
        locale === "en" ? latestRow.content_en : latestRow.content_ja,
      iconType:
        latestRow.icon_type === null
          ? null
          : (latestRow.icon_type as WhatsNewAnnouncement["iconType"]),
    };
  }, [latestRow, locale]);

  const bannerTitlePreview = announcementForModal?.title?.trim()
    ? announcementForModal.title
    : t("announcement.fallbackTitle");

  const persistDismiss = useCallback((announcementId: string) => {
    try {
      window.localStorage.setItem(LP_WHATSNEW_DISMISS_STORAGE_KEY, announcementId);
      setStoredDismissId(announcementId);
    } catch {
      return;
    }
  }, []);

  if (suppressForAuthenticatedSession || !loadDone) {
    return null;
  }

  if (!latestRow?.id || !announcementForModal || dismissedMatch) {
    return null;
  }

  function handleDismissBannerClick() {
    if (!latestRow?.id) {
      return;
    }
    persistDismiss(latestRow.id);
  }

  function handleModalCloseAfterConfirm() {
    setModalOpen(false);
    if (!latestRow?.id) {
      return;
    }
    persistDismiss(latestRow.id);
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 22 }}
        className="mb-8 flex flex-col gap-3 rounded-xl border border-zinc-800/90 bg-zinc-950/60 px-3 py-3 shadow-sm backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-2.5 sm:px-4"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Badge
            variant="secondary"
            className="shrink-0 border border-zinc-600 bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold tracking-widest text-zinc-100 uppercase"
          >
            {t("whatsNewBanner.newBadge")}
          </Badge>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="group min-h-[44px] min-w-0 flex-1 truncate text-left text-sm leading-snug text-zinc-100 underline-offset-4 transition hover:text-zinc-50 hover:underline"
          >
            {bannerTitlePreview}
          </button>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 sm:justify-start">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[44px] gap-1 border-zinc-600 bg-transparent text-zinc-100 hover:bg-zinc-900"
            onClick={() => setModalOpen(true)}
          >
            {t("whatsNewBanner.viewDetails")}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
          <button
            type="button"
            onClick={handleDismissBannerClick}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-transparent text-zinc-400 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
            aria-label={t("whatsNewBanner.dismissAria")}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </motion.div>

      {modalOpen ? (
        <WhatsNewModal
          key={`lp-whats-${latestRow.id}`}
          announcement={announcementForModal}
          defaultOpen
          markSeenBehavior="none"
          onClosed={handleModalCloseAfterConfirm}
        />
      ) : null}
    </>
  );
}
