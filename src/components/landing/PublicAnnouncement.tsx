"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import {
  AnnouncementRotateAndList,
  type SerializedAnnouncementListItem,
} from "@/components/announcements/announcement-rotate-and-list";
import type { AppLocale } from "@/i18n/routing";

type PublicAnnouncementApiRow = {
  id: string;
  title_ja: string;
  title_en: string;
  content_ja: string;
  content_en: string;
};

export function PublicAnnouncement() {
  const locale = useLocale() as AppLocale;
  const [serializedItems, setSerializedItems] = useState<SerializedAnnouncementListItem[]>(
    [],
  );

  useEffect(() => {
    async function loadPublishedAnnouncements() {
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
        if (!payload.ok || !Array.isArray(payload.items)) {
          return;
        }
        const localizedItems = payload.items.map((announcementRow) => ({
          id: announcementRow.id,
          title: locale === "en" ? announcementRow.title_en : announcementRow.title_ja,
          content: locale === "en" ? announcementRow.content_en : announcementRow.content_ja,
        }));
        const filteredItems = localizedItems.filter(
          (item) =>
            (item.title && item.title.trim().length > 0) ||
            (item.content && item.content.trim().length > 0),
        );
        setSerializedItems(filteredItems);
      } catch {
        return;
      }
    }
    void loadPublishedAnnouncements();
  }, [locale]);

  return <AnnouncementRotateAndList variant="landingBanner" items={serializedItems} />;
}
