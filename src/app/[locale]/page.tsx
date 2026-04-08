import { redirect } from "@/i18n/navigation";
import { LandingPage } from "@/components/landing/LandingPage";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ locale: string }> };

export default async function LandingTopPage({ params }: PageProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect({ href: "/dashboard", locale });
    return;
  }

  return <LandingPage />;
}
