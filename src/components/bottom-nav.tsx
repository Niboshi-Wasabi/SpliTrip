"use client";

/**
 * モバイル専用のボトムナビゲーションバー。md 以上では非表示にする。
 * Mobile-only bottom tab bar. Hidden on md+ where the header nav is used instead.
 *
 * 外出先メインのアプリなので、片手操作しやすい画面下部にナビを配置する。
 * Since this app is primarily used on the go, placing nav at the bottom enables easy one-handed use.
 */

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { SupportDeveloper } from "@/components/ads/SupportDeveloper";
import { Home, Settings, LogOut } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { isSupabaseConfigured } from "@/utils/supabase/env";
import { useRouter } from "@/i18n/navigation";
import { OptimizedLink } from "@/components/common/optimized-link";

const HIDDEN_PATHS = [
  "/",
  "/login",
  "/terms",
  "/privacy",
  "/onboarding",
  "/pitch",
  "/maintenance",
];

function isHiddenPath(pathnameWithoutLocalePrefix: string): boolean {
  if (HIDDEN_PATHS.includes(pathnameWithoutLocalePrefix)) {
    return true;
  }
  return pathnameWithoutLocalePrefix.startsWith("/pitch/");
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const translations = useTranslations("BottomNav");

  if (isHiddenPath(pathname)) return null;

  const isDashboard =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isSettings = pathname === "/settings";

  async function handleLogout() {
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.refresh();
    router.push("/");
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-sm md:hidden"
      role="navigation"
      aria-label={translations("ariaLabel")}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        <OptimizedLink
          href="/dashboard"
          className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors ${
            isDashboard
              ? "font-semibold text-blue-600 dark:text-blue-400"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Home className="h-5 w-5" />
          {translations("home")}
        </OptimizedLink>

        <OptimizedLink
          href="/settings"
          className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors ${
            isSettings
              ? "font-semibold text-blue-600 dark:text-blue-400"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings className="h-5 w-5" />
          {translations("settings")}
        </OptimizedLink>

        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <LogOut className="h-5 w-5" />
          {translations("logout")}
        </button>
      </div>

      <div className="border-t border-border/40 bg-muted/10 px-2 py-1.5">
        <SupportDeveloper variant="compact" />
      </div>

      {/* iPhone のセーフエリア分のパディング / Safe area padding for notched iPhones */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
