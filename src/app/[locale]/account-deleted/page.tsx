import { setRequestLocale, getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeletedAccountActions } from "@/components/auth/deleted-account-actions";

type AccountDeletedPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AccountDeletedPage({
  params,
}: AccountDeletedPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("DeletedAccount");

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center px-4 py-12 md:px-6">
      <Card className="w-full border-zinc-800 bg-zinc-950/70 text-zinc-100">
        <CardHeader>
          <CardTitle className="font-serif text-2xl tracking-tight md:text-3xl">
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm leading-relaxed text-zinc-300">
            {t("description")}
          </p>
          <p className="text-sm leading-relaxed text-zinc-400">
            {t("contactHint")}
          </p>
          <DeletedAccountActions />
        </CardContent>
      </Card>
    </main>
  );
}
