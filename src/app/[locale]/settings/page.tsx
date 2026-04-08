/**
 * Payment handle settings: reads/writes `user_profiles` columns used by settlement links.
 * 送金先設定: 精算リンク用の `user_profiles` カラムを読み書きする。
 */

import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserAvatar } from "@/components/user-avatar";
import { createClient } from "@/utils/supabase/server";
import { getMandatoryPitchHref } from "@/lib/user-profile";
import { DisplayNameForm } from "./display-name-form";
import { LanguagePreferenceForm } from "./language-preference-form";
import { PaymentSettingsForm } from "./payment-settings-form";
import { SupportDeveloper } from "@/components/ads/SupportDeveloper";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ locale: string }> };

export default async function SettingsPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations("Settings");
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

  const { data: profileJson, error } = await supabase.rpc("get_own_profile");

  if (error) {
    console.error("settings profile:", error.message);
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <p className="mx-auto max-w-lg text-sm text-destructive">
          プロフィールを読み込めませんでした。Supabase のマイグレーション（
          <code className="rounded bg-muted px-1">user_profiles</code> の
          カラム追加）を確認してください。
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
  const initialLanguage = row?.preferred_language === "en" ? "en" : "ja";
  const paymentColumnsMissing = row !== null && !("paypal_me_id" in row);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "min-h-[44px] md:min-h-0")}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("backDashboard")}
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-lg space-y-6 px-4 py-8 pb-24 md:pb-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <UserAvatar
                displayName={initialDisplayName || "ユーザー"}
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
            <CardTitle>{t("languageTitle")}</CardTitle>
            <CardDescription>{t("languageDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <LanguagePreferenceForm initialLanguage={initialLanguage} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>送金先の登録</CardTitle>
            <CardDescription>
              グループ精算で「あなたが支払う」相手に、PayPal.me や Cash App
              で送金しやすいようリンクを表示するために使います。他のメンバーに公開されます。
            </CardDescription>
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
        {/* Temporarily hidden while Stripe account review is pending. / Stripe審査対応待ちのため一時的に非表示にしています。 */}
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-4">
          <SupportDeveloper />
        </div>
      </main>
    </div>
  );
}
