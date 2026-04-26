import { getTranslations } from "next-intl/server";
import { createClient } from "@/utils/supabase/server";
import type { AppLocale } from "@/i18n/routing";

type Row = {
  id: string;
  title_ja: string;
  title_en: string;
  content_ja: string;
  content_en: string;
  icon_type: string | null;
  priority: number | null;
  created_at: string;
};

type Props = {
  locale: AppLocale;
};

/**
 * Renders published in-app announcements below the maintenance strip (all locale routes).
 * メンテ／事前告知バナー直下に、`app_announcements` の **公開** 行のみを表示する（全ロケール共通）。
 * RLS allows `anon` to `select` rows where `is_published = true`.
 */
export async function PublishedAppAnnouncements({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: "AppAnnouncements" });

  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (clientError) {
    console.error("[PublishedAppAnnouncements] Supabase client:", clientError);
    return null;
  }

  const { data, error } = await supabase
    .from("app_announcements")
    .select("id, title_ja, title_en, content_ja, content_en, icon_type, priority, created_at")
    .eq("is_published", true)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("[PublishedAppAnnouncements] query:", error);
    return null;
  }

  const rows = (data ?? []) as Row[];
  const visible = rows
    .map((row) => {
      const title = locale === "en" ? row.title_en : row.title_ja;
      const content = locale === "en" ? row.content_en : row.content_ja;
      return { id: row.id, title, content };
    })
    .filter(
      (row) =>
        (row.title && row.title.trim().length > 0) ||
        (row.content && row.content.trim().length > 0),
    );

  if (visible.length === 0) {
    return null;
  }

  return (
    <section
      aria-label={t("stripTitle")}
      className="border-b border-zinc-800/60 bg-zinc-900/20 px-4 py-4"
    >
      <div className="mx-auto w-full max-w-3xl space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          {t("stripTitle")}
        </h2>
        <ul className="space-y-3">
          {visible.map((row) => (
            <li
              key={row.id}
              className="rounded-md border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5"
            >
              {row.title && row.title.trim().length > 0 ? (
                <p className="font-serif text-sm font-medium tracking-tight text-zinc-100">
                  {row.title}
                </p>
              ) : null}
              {row.content && row.content.trim().length > 0 ? (
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-400">{row.content}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
