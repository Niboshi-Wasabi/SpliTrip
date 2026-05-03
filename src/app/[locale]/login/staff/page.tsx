import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { routing } from "@/i18n/routing";
import { LoginForm } from "../../login-form";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  if (!hasLocale(routing.locales, localeParam)) {
    return { title: "SpliTrip", robots: { index: false, follow: false } };
  }
  const translations = await getTranslations({
    locale: localeParam,
    namespace: "Login",
  });
  return {
    title: translations("staffLoginPageTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function StaffLoginPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  if (!hasLocale(routing.locales, localeParam)) {
    notFound();
  }
  setRequestLocale(localeParam);
  return (
    <Suspense>
      <LoginForm staffMaintenanceEntry />
    </Suspense>
  );
}
