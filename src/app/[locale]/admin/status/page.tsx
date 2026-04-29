import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { SystemStatusAdminForm } from "./system-status-form";

export const dynamic = "force-dynamic";

type PageParams = { params: Promise<{ locale: string }> };

export default async function AdminSystemStatusPage({ params }: PageParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  const adminTranslations = await getTranslations("Admin");

  return (
    <Card>
      <CardHeader>
        <CardDescription>
          {adminTranslations("systemStatusPageDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SystemStatusAdminForm />
      </CardContent>
    </Card>
  );
}
