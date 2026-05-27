"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo-mark";
import { UserAvatarMenu } from "@/components/user-avatar-menu";
import { APPLE_CONTENT_WIDTH_CLASS } from "@/lib/ui/apple-design";
import { cn } from "@/lib/utils";

type LandingHeaderProps = {
  isAuthenticated: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
};

export function LandingHeader({
  isAuthenticated,
  displayName,
  avatarUrl,
  isAdmin,
}: LandingHeaderProps) {
  const t = useTranslations("LandingV2");

  return (
    <header className="sticky top-0 z-30 h-12 border-b border-[var(--apple-separator)] bg-black/80 backdrop-blur-xl">
      <div
        className={cn(
          APPLE_CONTENT_WIDTH_CLASS,
          "flex h-full items-center justify-between",
        )}
      >
        <Link href="/" className="text-[var(--apple-text)]">
          <LogoMark />
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-[var(--apple-text-secondary)] lg:flex">
          <a
            href="#features"
            className="min-h-[44px] content-center transition-opacity hover:opacity-80"
          >
            {t("nav.features")}
          </a>
          <a
            href="#use-cases"
            className="min-h-[44px] content-center transition-opacity hover:opacity-80"
          >
            {t("nav.useCases")}
          </a>
          <a
            href="#details"
            className="min-h-[44px] content-center transition-opacity hover:opacity-80"
          >
            {t("nav.details")}
          </a>
          <a
            href="#pricing"
            className="min-h-[44px] content-center transition-opacity hover:opacity-80"
          >
            {t("nav.pricing")}
          </a>
        </nav>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link href="/dashboard">
                <Button
                  variant="ghost"
                  className="min-h-[44px] text-[var(--apple-text-secondary)] transition-opacity hover:opacity-80"
                >
                  {t("actions.dashboard")}
                </Button>
              </Link>
              <UserAvatarMenu
                displayName={displayName ?? "User"}
                avatarUrl={avatarUrl}
                isAdmin={isAdmin}
                variant="landing"
                size="sm"
                accountAriaLabel={t("actions.accountAria")}
              />
            </>
          ) : (
            <Link href="/login">
              <Button
                variant="ghost"
                className="min-h-[44px] text-[var(--apple-text-secondary)] transition-opacity hover:opacity-80"
              >
                {t("actions.login")}
              </Button>
            </Link>
          )}
          <Badge
            variant="secondary"
            className="border border-[var(--apple-separator)] bg-[var(--apple-surface)] text-[10px] tracking-widest text-[var(--apple-text-secondary)] uppercase"
          >
            BETA
          </Badge>
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
