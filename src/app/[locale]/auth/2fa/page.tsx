import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { sanitizeRedirectPath } from "@/lib/auth/sanitize-redirect-path";
import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TwoFactorGate } from "@/components/auth/two-factor-gate";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
};

export default async function TwoFactorPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const query = await searchParams;
  const t = await getTranslations("TwoFactor");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/", locale });
    return;
  }

  const sanitizedNextPath = sanitizeRedirectPath(query.next) ?? "/dashboard";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("gateTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <TwoFactorGate nextPath={sanitizedNextPath} />
        </CardContent>
      </Card>
    </div>
  );
}
