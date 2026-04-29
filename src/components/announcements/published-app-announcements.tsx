import { createClient } from "@supabase/supabase-js";
import type { AppLocale } from "@/i18n/routing";
import { getSupabaseEnv } from "@/utils/supabase/env";
import {
  AnnouncementRotateAndList,
  type SerializedAnnouncementListItem,
} from "@/components/announcements/announcement-rotate-and-list";

type Row = {
  id: string;
  title_ja: string;
  title_en: string;
  content_ja: string;
  content_en: string;
  icon_type: string | null;
  priority: number | null;
  expires_at: string | null;
  created_at: string;
};

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
  const env = getSupabaseEnv();
  if (!env) {
    return null;
  }
  const supabase = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const nowIsoTimestamp = new Date().toISOString();

  const { data, error } = await supabase
    .from("app_announcements")
    .select("id, title_ja, title_en, content_ja, content_en, icon_type, priority, expires_at, created_at")
    .eq("is_published", true)
    .or(`expires_at.is.null,expires_at.gt.${nowIsoTimestamp}`)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("[PublishedAppAnnouncements] query:", error);
    return null;
  }

  const rows = (data ?? []) as Row[];
  const serializedItems: SerializedAnnouncementListItem[] = rows
    .map((row) => ({
      id: row.id,
      title: locale === "en" ? row.title_en : row.title_ja,
      content: locale === "en" ? row.content_en : row.content_ja,
    }))
    .filter(
      (row) =>
        (row.title && row.title.trim().length > 0) ||
        (row.content && row.content.trim().length > 0),
    );

  return <AnnouncementRotateAndList variant="appStrip" items={serializedItems} />;
}
