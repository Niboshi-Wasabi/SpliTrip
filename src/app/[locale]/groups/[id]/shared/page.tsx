import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Read-only group summary for share links (no login). Token must match `groups.public_share_token`.
 * 閲覧専用サマリー。`?t=` は DB の public_share_token と一致する必要あり。
 */

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ t?: string }>;
};

export default async function GroupSharedReadOnlyPage({
  params,
  searchParams,
}: PageProps) {
  const { locale, id: groupId } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const tokenRaw = typeof query.t === "string" ? query.t.trim() : "";
  if (!tokenRaw) {
    notFound();
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_group_shared_summary", {
    p_group_id: groupId,
    p_share_token: tokenRaw,
  });

  if (error || data === null || typeof data !== "object") {
    notFound();
  }

  const summary = data as {
    group_id: string;
    name: string;
    currency_code: string;
  };

  const sharedTranslations = await getTranslations("SharedGroup");

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-lg space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--apple-text-secondary)]">
          {sharedTranslations("badge")}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{summary.name}</h1>
        <p className="text-sm text-[var(--apple-text-secondary)]">
          {sharedTranslations("hint")}
        </p>
        <p className="text-sm tabular-nums text-[var(--apple-text)]">
          {sharedTranslations("currencyLabel")}: {summary.currency_code}
        </p>
      </div>
    </div>
  );
}
