"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Megaphone } from "lucide-react";
import { useTranslations } from "next-intl";
import type { AppLocale } from "@/i18n/routing";
import { SafeMarkdown } from "@/components/markdown/safe-markdown";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SerializedPublicAnnouncementItem } from "@/lib/public-app-announcements";

const ROTATION_INTERVAL_MS = 5600;

/** @deprecated `SerializedPublicAnnouncementItem` に統一 */
export type SerializedAnnouncementListItem = SerializedPublicAnnouncementItem;

type AnnouncementRotateAndListProps = {
  variant: "appStrip" | "landingBanner";
  items: SerializedPublicAnnouncementItem[];
};

function deriveDisplayTitle(
  titleText: string,
  fallbackTitle: string,
): string {
  return titleText.trim().length > 0 ? titleText.trim() : fallbackTitle;
}

/**
 * アプリ内ストリップ／LP のお知らせを **単一バナー** でローテーション表示し、
 * クリックで **一覧モーダル**（複数でもまとめて一覧）を開く。
 */
export function AnnouncementRotateAndList({
  variant,
  items,
}: AnnouncementRotateAndListProps) {
  const appAnnouncementsTranslation = useTranslations("AppAnnouncements");
  const landingAnnouncementTranslation = useTranslations("LandingV2.announcement");

  const translationsForVariant = variant === "appStrip"
    ? {
        fallbackTitle: appAnnouncementsTranslation("fallbackTitle"),
        fallbackBody: appAnnouncementsTranslation("fallbackBody"),
      }
    : {
        fallbackTitle: landingAnnouncementTranslation("fallbackTitle"),
        fallbackBody: landingAnnouncementTranslation("fallbackBody"),
      };

  const [activeIndex, setActiveIndex] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  const announcementItemFingerprint = items.map((row) => row.id).join(",");
  useEffect(() => {
    setActiveIndex(0);
  }, [announcementItemFingerprint]);

  const itemCount = items.length;

  const advanceCarousel = useCallback(() => {
    setActiveIndex((previousIndex) =>
      previousIndex + 1 >= itemCount ? 0 : previousIndex + 1,
    );
  }, [itemCount]);

  useEffect(() => {
    if (itemCount <= 1 || dialogOpen) {
      return undefined;
    }
    const carouselTimer = window.setInterval(() => advanceCarousel(), ROTATION_INTERVAL_MS);
    return () => window.clearInterval(carouselTimer);
  }, [advanceCarousel, dialogOpen, itemCount]);

  const activeItem = items[Math.min(activeIndex, Math.max(items.length - 1, 0))];

  const activeTitleDisplayed = useMemo(() => {
    if (!activeItem) {
      return translationsForVariant.fallbackTitle;
    }
    return deriveDisplayTitle(
      activeItem.title,
      translationsForVariant.fallbackTitle,
    );
  }, [activeItem, translationsForVariant.fallbackTitle]);

  if (itemCount === 0) {
    return null;
  }

  const stripAriaLabel = appAnnouncementsTranslation("stripTitle");
  const listDialogTitle = appAnnouncementsTranslation("listDialogTitle");

  const openDialog = () => {
    setDialogOpen(true);
  };

  return (
    <>
      {variant === "appStrip" ? (
        <section
          aria-label={stripAriaLabel}
          className="border-b border-zinc-800/60 bg-zinc-900/20 px-4 py-3"
        >
          <div className="mx-auto flex w-full max-w-3xl items-center gap-3 overflow-hidden">
            <Megaphone
              className="h-4 w-4 shrink-0 text-zinc-500"
              aria-label={stripAriaLabel}
            />
            <button
              type="button"
              onClick={openDialog}
              className="group flex min-h-[44px] min-w-0 flex-1 cursor-pointer gap-3 rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2 text-left transition hover:border-zinc-700 hover:bg-zinc-950/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              aria-expanded={dialogOpen}
            >
              <div className="relative min-h-[1.25rem] min-w-0 flex-1 overflow-hidden">
                <AnimatePresence initial={false} mode="wait">
                  <motion.div
                    key={activeItem?.id ?? activeIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="font-sans text-sm font-medium tracking-tight text-zinc-100"
                  >
                    <span className="line-clamp-2 md:line-clamp-1">
                      {activeTitleDisplayed}
                    </span>
                  </motion.div>
                </AnimatePresence>
              </div>
              {itemCount > 1 ? (
                <div className="flex shrink-0 items-center gap-1.5" aria-hidden>
                  {items.map((listItem, itemIndex) => (
                    <span
                      key={listItem.id}
                      className={`h-1.5 w-1.5 rounded-full transition-colors ${
                        itemIndex === activeIndex % itemCount
                          ? "bg-zinc-200"
                          : "bg-zinc-600 group-hover:bg-zinc-500"
                      }`}
                    />
                  ))}
                </div>
              ) : null}
            </button>
          </div>
        </section>
      ) : (
        <button
          type="button"
          onClick={openDialog}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-left transition hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
          aria-expanded={dialogOpen}
          aria-label={stripAriaLabel}
        >
          <div className="flex items-center gap-3">
            <Megaphone className="h-4 w-4 shrink-0 text-zinc-300" />
            <Badge
              variant="outline"
              className="border-zinc-700 bg-zinc-950 text-[10px] uppercase tracking-widest text-zinc-300"
            >
              {landingAnnouncementTranslation("badge")}
            </Badge>
            <div className="relative min-h-[1.25rem] min-w-0 flex-1 overflow-hidden">
              <AnimatePresence initial={false} mode="wait">
                <motion.p
                  key={activeItem?.id ?? activeIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="truncate text-sm font-medium text-zinc-100"
                  aria-live="polite"
                >
                  {activeTitleDisplayed}
                </motion.p>
              </AnimatePresence>
            </div>
            {itemCount > 1 ? (
              <div className="flex shrink-0 items-center gap-1" aria-hidden>
                {items.map((listItem, itemIndex) => (
                  <span
                    key={listItem.id}
                    className={`h-1.5 w-1.5 rounded-full ${
                      itemIndex === activeIndex % itemCount
                        ? "bg-zinc-200"
                        : "bg-zinc-600"
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </button>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="flex max-h-[min(82vh,40rem)] max-w-xl flex-col overflow-hidden border-zinc-800 bg-zinc-950 p-0 text-zinc-100 ring-zinc-800 sm:max-w-xl"
          showCloseButton
        >
          <DialogHeader className="shrink-0 border-b border-zinc-800 px-5 py-4 pr-14 text-left">
            <DialogTitle className="font-sans text-lg leading-tight tracking-tight text-zinc-50">
              {listDialogTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <ul className="space-y-8">
              {items.map((announcementItem) => {
                const itemTitleShown = deriveDisplayTitle(
                  announcementItem.title,
                  translationsForVariant.fallbackTitle,
                );
                return (
                  <li
                    key={announcementItem.id}
                    className="border-b border-zinc-800/80 pb-8 last:border-b-0 last:pb-0"
                  >
                    <h3 className="font-sans text-base font-semibold tracking-tight text-zinc-50">
                      {itemTitleShown}
                    </h3>
                    {announcementItem.content.trim().length > 0 ? (
                      <SafeMarkdown
                        markdown={announcementItem.content}
                        className="prose prose-sm dark:prose-invert prose-zinc mt-3 max-w-none text-zinc-300"
                      />
                    ) : (
                      <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                        {translationsForVariant.fallbackBody}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
