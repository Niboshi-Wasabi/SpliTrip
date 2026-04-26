import { redirect } from "@/i18n/navigation";
import { toIntlRouterPathFromMiddlewareNext } from "@/lib/auth/sanitize-redirect-path";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
};

/**
 * 2FA は廃止。旧リンクやブックマークから来た場合は安全なパスへ送る。
 */
export default async function TwoFactorPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const query = await searchParams;
  const nextPath = toIntlRouterPathFromMiddlewareNext(query.next) ?? "/dashboard";
  redirect({ href: nextPath, locale });
}
