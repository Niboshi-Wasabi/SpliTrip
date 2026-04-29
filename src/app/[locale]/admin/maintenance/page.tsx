import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { MaintenanceScheduleForm } from "./maintenance-schedule-form";

export const dynamic = "force-dynamic";

type PageParams = { params: Promise<{ locale: string }> };

export default async function AdminMaintenancePage({ params }: PageParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  const adminTranslations = await getTranslations("Admin");

  return (
    <Card>
      <CardHeader>
        <CardDescription>
          {adminTranslations("maintenancePageDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MaintenanceScheduleForm />
      </CardContent>
    </Card>
  );
}
