import { redirect } from "@/i18n/navigation";

type PageProps = { 
  params: Promise<{ locale: string }> 
};

/**
 * /[locale]/groups へのダイレクトアクセスをダッシュボードにリダイレクト
 * プリフェッチで発生する404エラーを防ぐためのキャッチルート
 */
export default async function LocalizedGroupsRootPage({ params }: PageProps) {
  const { locale } = await params;
  redirect({ href: "/dashboard", locale });
}