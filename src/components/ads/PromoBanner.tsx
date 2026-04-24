import { getPromoBannerConfigFromDatabase } from "@/lib/system-settings";

type Props = {
  hidden?: boolean;
  /** `ja` | `en` など。ラベル表示に使う。 */
  locale: string;
};

/**
 * 管理画面 `promo_banner_config`（system_settings）があれば表示（再デプロイ不要）。
 * When empty, renders nothing.
 */
export async function PromoBanner({ hidden = false, locale }: Props) {
  if (hidden) {
    return null;
  }
  const config = await getPromoBannerConfigFromDatabase();
  const href = (config?.href ?? "").trim();
  if (!href) {
    return null;
  }
  const label =
    (locale === "en" ? config?.labelEn : config?.labelJa) ||
    (locale === "en" ? "Partner link" : "提携・プロモ");
  const imageUrl = (config?.imageUrl ?? "").trim();

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block overflow-hidden rounded-lg border border-border bg-card text-left shadow-sm transition hover:bg-muted/40"
    >
      <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="h-20 w-full rounded object-cover sm:h-16 sm:w-28"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{href}</p>
        </div>
        <span className="shrink-0 text-xs text-primary underline">↗</span>
      </div>
    </a>
  );
}
