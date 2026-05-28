/**
 * Payment handle settings: reads/writes `user_profiles` columns used by settlement links.
 * 送金先設定: 精算リンク用の `user_profiles` カラムを読み書きする。
 */

import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { Shield } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { createClient } from "@/utils/supabase/server";
import { getMandatoryPitchHref } from "@/lib/user-profile";
import { DisplayNameForm } from "./display-name-form";
import { LanguagePreferenceForm } from "./language-preference-form";
import { PaymentSettingsForm } from "./payment-settings-form";
import { SupportDeveloper } from "@/components/ads/SupportDeveloper";
import { isAppLocale } from "@/lib/i18n/next-intl-locale";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ locale: string }> };

export default async function SettingsPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations("Settings");
  const tAdmin = await getTranslations("Admin");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/", locale });
    return;
  }

  const pitchHref = await getMandatoryPitchHref(supabase, "/settings");
  if (pitchHref) {
    redirect({ href: pitchHref, locale });
    return;
  }

  const [profileRes, roleRes] = await Promise.all([
    supabase.rpc("get_own_profile"),
    supabase.from("user_profiles").select("is_admin").eq("id", user.id).maybeSingle(),
  ]);
  const profileJson = profileRes.data;
  const error = profileRes.error;
  const isAdmin = roleRes.data?.is_admin === true;

  if (error) {
    console.error("[API/Action Error - settings get_own_profile]:", error);
    return (
      <div className="px-4 py-10">
        <p className="mx-auto max-w-lg text-sm text-rose-600 dark:text-rose-300">
          {t("profileLoadErrorLead")}（
          <code className="rounded bg-[var(--apple-fill-tertiary)] px-1">user_profiles</code> の
          {t("profileLoadErrorTrail")}
        </p>
      </div>
    );
  }

  const row =
    profileJson && typeof profileJson === "object"
      ? (profileJson as Record<string, unknown>)
      : null;
  const initialPaypal =
    typeof row?.paypal_me_id === "string" ? row.paypal_me_id : "";
  const initialCash =
    typeof row?.cash_app_cashtag === "string" ? row.cash_app_cashtag : "";
  const initialDisplayName =
    typeof row?.display_name === "string" && row.display_name.trim().length > 0
      ? row.display_name
      : "";
  const initialAvatarUrl =
    typeof row?.avatar_url === "string" && row.avatar_url.trim().length > 0
      ? row.avatar_url
      : null;
  const preferredLanguageValue = row?.preferred_language;
  const initialLanguage =
    typeof preferredLanguageValue === "string" &&
    isAppLocale(preferredLanguageValue)
      ? preferredLanguageValue
    : "ja";
  const paymentColumnsMissing = row !== null && !("paypal_me_id" in row);

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <UserAvatar
              displayName={initialDisplayName || t("defaultDisplayName")}
              avatarUrl={initialAvatarUrl}
              size="lg"
            />
            <div>
              <CardTitle>{t("displayNameTitle")}</CardTitle>
              <CardDescription>{t("displayNameDescription")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DisplayNameForm initialDisplayName={initialDisplayName} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("languageTitleBilingual")}</CardTitle>
        </CardHeader>
        <CardContent>
          <LanguagePreferenceForm initialLanguage={initialLanguage} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("paymentTitleBilingual")}</CardTitle>
          <CardDescription>{t("paymentDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentColumnsMissing ? (
            <p
              className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-100"
              role="status"
            >
              {t("paymentMigrationHint")}
            </p>
          ) : null}
          <PaymentSettingsForm
            initialPaypalMeId={initialPaypal}
            initialCashAppCashtag={initialCash}
            paymentSaveDisabled={paymentColumnsMissing}
          />
        </CardContent>
      </Card>
      {isAdmin ? (
        <Card className="border-violet-500/25 bg-violet-500/5">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Shield
                className="h-5 w-5 text-violet-600 dark:text-violet-400"
                strokeWidth={1.75}
                aria-hidden
              />
              <CardTitle className="text-base">{tAdmin("systemAdministration")}</CardTitle>
              <Badge
                variant="secondary"
                className="shrink-0 border-violet-500/30 bg-violet-500/15 text-[10px] font-medium text-violet-800 dark:text-violet-200"
              >
                {tAdmin("adminOnlyBadge")}
              </Badge>
            </div>
            <CardDescription>{tAdmin("systemAdminDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/admin"
              className={cn(
                buttonVariants(),
                "inline-flex min-h-[44px] w-full items-center justify-center sm:w-auto md:min-h-0",
              )}
            >
              {tAdmin("goToAdminPanel")}
            </Link>
          </CardContent>
        </Card>
      ) : null}
      <div className="rounded-lg border border-dashed border-[var(--apple-separator)] bg-[var(--apple-fill-tertiary)] p-4">
        <SupportDeveloper />
      </div>
    </div>
  );
}
