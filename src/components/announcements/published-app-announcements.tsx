import type { AppLocale } from "@/i18n/routing";
import { AnnouncementRotateAndList } from "@/components/announcements/announcement-rotate-and-list";
import { fetchPublishedAnnouncementListForLocale } from "@/lib/public-app-announcements";

type Props = {
  locale: AppLocale;
};

/**
 * Renders published in-app announcements below the maintenance strip (all locale routes).
 * メンテ／事前告知バナー直下に、`app_announcements` の **公開** 行のみを表示する。
 * RLS allows `anon` to `select` rows where `is_published = true`.
 * 複数件はストリップ上で順にフェード・切り替え、クリックで一覧モーダル。
 */
export async function PublishedAppAnnouncements({ locale }: Props) {
  const serializedItems = await fetchPublishedAnnouncementListForLocale(locale);
  if (serializedItems.length === 0) {
    return null;
  }

  return <AnnouncementRotateAndList variant="appStrip" items={serializedItems} />;
}
