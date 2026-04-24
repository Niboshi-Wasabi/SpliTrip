import { getTranslations } from "next-intl/server";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "@/i18n/navigation";
import { isAppLocale } from "@/lib/i18n/next-intl-locale";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { AnnouncementsManager } from "./announcements-manager";

export const dynamic = "force-dynamic";

type PageParams = { params: Promise<{ locale: string }> };

export default async function AdminAnnouncementsPage({ params }: PageParams) {
  const { locale: raw } = await params;
  const locale = isAppLocale(raw) ? raw : "ja";
  const t = await getTranslations("Admin");
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (authUser === null) {
    redirect({ href: "/login", locale });
    return null;
  }
  const { data: p } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", authUser.id)
    .maybeSingle();
  if (p?.is_admin !== true) {
    redirect({ href: "/dashboard", locale });
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>{t("announcementsPageDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <AnnouncementsManager />
      </CardContent>
    </Card>
  );
}
