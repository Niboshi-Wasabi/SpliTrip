import { createClient } from "@supabase/supabase-js";
import type { AppLocale } from "@/i18n/routing";
import { getSupabaseEnv } from "@/utils/supabase/env";

type AnnouncementDbRow = {
  id: string;
  title_ja: string;
  title_en: string;
  content_ja: string;
  content_en: string;
  icon_type: string | null;
  priority: number | null;
  display_order: number | null;
  expires_at: string | null;
  created_at: string;
};

/** ストリップ／LP／メンテ画面などで共通利用する公開お知らせの直列形。 */
export type SerializedPublicAnnouncementItem = {
  id: string;
  title: string;
  content: string;
};

/**
 * `app_announcements` の公開かつ期限内の行のみ、最大 5 件。
 * RLS: anon でも `is_published=true` が SELECT 可。
 */
export async function fetchPublishedAnnouncementListForLocale(
  locale: AppLocale,
): Promise<SerializedPublicAnnouncementItem[]> {
  const env = getSupabaseEnv();
  if (!env) {
    return [];
  }
  const supabase = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const nowIsoTimestamp = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from("app_announcements")
      .select(
        "id, title_ja, title_en, content_ja, content_en, icon_type, priority, display_order, expires_at, created_at",
      )
      .eq("is_published", true)
      .or(`expires_at.is.null,expires_at.gt.${nowIsoTimestamp}`)
      .order("display_order", { ascending: true })
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      // 公開お知らせは非クリティカルなため、取得失敗時は静かに空配列へフォールバックする。
      return [];
    }

    const rows = (data ?? []) as AnnouncementDbRow[];
    return rows
      .map((announcementRow) => ({
        id: announcementRow.id,
        title:
          locale === "en"
            ? announcementRow.title_en
            : announcementRow.title_ja,
        content:
          locale === "en"
            ? announcementRow.content_en
            : announcementRow.content_ja,
      }))
      .filter(
        (row) =>
          (row.title && row.title.trim().length > 0) ||
          (row.content && row.content.trim().length > 0),
      );
  } catch (error) {
    console.error(
      "[API/Action Error - fetchPublishedAnnouncementListForLocale]:",
      error,
    );
    return [];
  }
}
