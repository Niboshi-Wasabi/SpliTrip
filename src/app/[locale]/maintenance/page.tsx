import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

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
    namespace: "Maintenance",
  });
  return {
    title: translations("pageTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function MaintenancePage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  if (!hasLocale(routing.locales, localeParam)) {
    notFound();
  }
  const locale = localeParam as AppLocale;
  setRequestLocale(localeParam);
  const translations = await getTranslations("Maintenance");

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {translations("headline")}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {translations("body")}
        </p>
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "default", size: "lg" }),
            "mt-8 min-h-[44px] w-full",
          )}
        >
          {translations("tryAgain")}
        </Link>
      </div>
    </div>
  );
}
