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
import { Home, Settings, LogOut } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { isSupabaseConfigured } from "@/utils/supabase/env";
import { useRouter } from "@/i18n/navigation";
import { OptimizedLink } from "@/components/common/optimized-link";

const HIDDEN_PATHS = [
  "/",
  "/login",
  "/login/staff",
  "/terms",
  "/privacy",
  "/onboarding",
  "/pitch",
  "/maintenance",
  "/status",
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--apple-separator)] bg-[var(--apple-nav-bg)] backdrop-blur-xl md:hidden"
      role="navigation"
      aria-label={translations("ariaLabel")}
    >
      <div className="mx-auto flex h-[56px] max-w-lg items-stretch justify-around">
        <OptimizedLink
          href="/dashboard"
          className={`flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 font-sans transition-colors ${
            isDashboard
              ? "text-[var(--apple-link)]"
              : "text-[var(--apple-text-secondary)]"
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[11px] font-medium leading-none">
            {translations("home")}
          </span>
        </OptimizedLink>

        <OptimizedLink
          href="/settings"
          className={`flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 font-sans transition-colors ${
            isSettings
              ? "text-[var(--apple-link)]"
              : "text-[var(--apple-text-secondary)]"
          }`}
        >
          <Settings className="h-5 w-5" />
          <span className="text-[11px] font-medium leading-none">
            {translations("settings")}
          </span>
        </OptimizedLink>

        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 font-sans text-[var(--apple-text-secondary)] transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-[11px] font-medium leading-none">
            {translations("logout")}
          </span>
        </button>
      </div>

      {/* iPhone のセーフエリア分のパディング / Safe area padding for notched iPhones */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
