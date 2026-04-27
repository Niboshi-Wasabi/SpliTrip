"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  BellRing,
  PartyPopper,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AnnouncementIconType =
  | "feature"
  | "bugfix"
  | "announcement"
  | "design"
  | "security"
  | "maintenance"
  | null;

export type WhatsNewAnnouncement = {
  id: string;
  title: string;
  content: string;
  iconType: AnnouncementIconType;
};

type WhatsNewModalProps = {
  announcement: WhatsNewAnnouncement;
  defaultOpen: boolean;
};

function resolveAnnouncementIcon(iconType: AnnouncementIconType) {
  switch (iconType) {
    case "feature":
      return Sparkles;
    case "bugfix":
      return Wrench;
    case "security":
      return ShieldCheck;
    case "maintenance":
      return AlertCircle;
    case "design":
      return PartyPopper;
    case "announcement":
    default:
      return BellRing;
  }
}

export function WhatsNewModal({ announcement, defaultOpen }: WhatsNewModalProps) {
  const t = useTranslations("AppAnnouncements");
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const AnnouncementIcon = resolveAnnouncementIcon(announcement.iconType);

  async function handleConfirm() {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch("/api/profile/last-seen-announcement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ announcementId: announcement.id }),
      });

      if (!response.ok) {
        throw new Error("save_failed");
      }

      setIsOpen(false);
    } catch (error) {
      console.error("[WhatsNewModal] mark seen failed:", error);
      setSaveError(t("markSeenError"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-md md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          role="presentation"
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="w-full max-w-xl"
          >
            <Card className="border-zinc-800 bg-zinc-950/95 text-zinc-100 shadow-2xl">
              <CardHeader className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-200">
                    <AnnouncementIcon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium tracking-widest text-zinc-400 uppercase">
                      {t("badge")}
                    </p>
                    <CardTitle className="font-serif text-xl leading-tight tracking-tight text-zinc-50">
                      {announcement.title || t("fallbackTitle")}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                  {announcement.content || t("fallbackBody")}
                </p>

                {saveError ? (
                  <p className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-200">
                    {saveError}
                  </p>
                ) : null}

                <Button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isSaving}
                  className="min-h-[44px] w-full"
                >
                  {isSaving ? t("confirming") : t("confirm")}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
