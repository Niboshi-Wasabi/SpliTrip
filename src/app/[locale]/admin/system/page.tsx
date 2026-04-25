import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { SystemSettingsForm } from "./system-settings-form";

export const dynamic = "force-dynamic";

type PageParams = { params: Promise<{ locale: string }> };

export default async function AdminSystemPage({ params }: PageParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin");

  return (
    <Card>
      <CardHeader>
        <CardDescription>{t("systemPageDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <SystemSettingsForm />
      </CardContent>
    </Card>
  );
}
