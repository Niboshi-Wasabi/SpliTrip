"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, X } from "lucide-react";
import { SafeMarkdown } from "@/components/markdown/safe-markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AppLocale } from "@/i18n/routing";

type PublicAnnouncementRow = {
  id: string;
  title_ja: string;
  title_en: string;
  content_ja: string;
  content_en: string;
};

const storageKeyByAnnouncementId = (announcementId: string) =>
  `splitrip:public-announcement:dismissed:${announcementId}`;

export function PublicAnnouncement() {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("LandingV2.announcement");
  const [announcementRow, setAnnouncementRow] = useState<PublicAnnouncementRow | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    async function fetchLatest() {
      const response = await fetch("/api/public/announcements/latest", {
        cache: "no-store",
      });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as {
        ok?: boolean;
        item?: PublicAnnouncementRow | null;
      };
      if (!payload.ok || !payload.item) {
        return;
      }
      const dismissed = localStorage.getItem(storageKeyByAnnouncementId(payload.item.id));
      setAnnouncementRow(payload.item);
      setIsDismissed(dismissed === "1");
    }
    void fetchLatest();
  }, []);

  const localizedTitle = useMemo(() => {
    if (!announcementRow) {
      return "";
    }
    return locale === "en" ? announcementRow.title_en : announcementRow.title_ja;
  }, [announcementRow, locale]);

  const localizedContent = useMemo(() => {
    if (!announcementRow) {
      return "";
    }
    return locale === "en" ? announcementRow.content_en : announcementRow.content_ja;
  }, [announcementRow, locale]);

  if (!announcementRow || isDismissed) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-left transition hover:bg-zinc-900"
      >
        <div className="flex items-center gap-3">
          <Megaphone className="h-4 w-4 shrink-0 text-zinc-300" />
          <Badge
            variant="outline"
            className="border-zinc-700 bg-zinc-950 text-[10px] uppercase tracking-widest text-zinc-300"
          >
            {t("badge")}
          </Badge>
          <p className="truncate text-sm font-medium text-zinc-100">{localizedTitle || t("fallbackTitle")}</p>
        </div>
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-xl rounded-xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-100 shadow-2xl"
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold tracking-tight">
                  {localizedTitle || t("fallbackTitle")}
                </h3>
                <button
                  type="button"
                  className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-200"
                  onClick={() => setIsOpen(false)}
                  aria-label={t("close")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {localizedContent.trim().length > 0 ? (
                <SafeMarkdown
                  markdown={localizedContent}
                  className="prose prose-sm dark:prose-invert prose-zinc max-w-none text-zinc-300"
                />
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                  {t("fallbackBody")}
                </p>
              )}
              <div className="mt-5 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  {t("close")}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    localStorage.setItem(storageKeyByAnnouncementId(announcementRow.id), "1");
                    setIsDismissed(true);
                    setIsOpen(false);
                  }}
                >
                  {t("dismiss")}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
