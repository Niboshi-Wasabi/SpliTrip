"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { createClient } from "@/utils/supabase/client";
import { isSupabaseConfigured } from "@/utils/supabase/env";
import { useRouter } from "@/i18n/navigation";
import { stripLocaleFromPathname } from "@/utils/supabase/middleware";
import {
  AUTH_NAV_ITEMS,
  AUTH_NAV_LOGOUT_ITEM,
  isAuthNavItemActive,
} from "@/lib/app-navigation";
import { APPLE_TAB_LABEL_CLASS } from "@/lib/ui/apple-design";

type AuthAppSidebarProps = {
  displayName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
};

export function AuthAppSidebar({
  displayName,
  avatarUrl,
  isAdmin,
}: AuthAppSidebarProps) {
  const pathname = usePathname();
  const pathWithoutLocale = stripLocaleFromPathname(pathname);
  const router = useRouter();
  const tNav = useTranslations("BottomNav");

  const handleLogout = useCallback(async () => {
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.refresh();
    router.push("/");
  }, [router]);

  const LogoutIcon = AUTH_NAV_LOGOUT_ITEM.icon;

  return (
    <aside className="relative hidden h-full w-[220px] shrink-0 flex-col border-r border-[var(--apple-separator)] bg-[var(--apple-surface)] md:flex">
      {/* Account header */}
      <div className="flex h-[48px] shrink-0 items-center gap-2.5 border-b border-[var(--apple-separator)] px-4">
        <UserAvatar displayName={displayName} avatarUrl={avatarUrl} size="sm" />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--apple-text)]">
          {displayName || "Account"}
        </p>
      </div>

      {/* Navigation */}
      <nav
        className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-2 py-3"
        aria-label={tNav("ariaLabel")}
      >
        {AUTH_NAV_ITEMS.map((navItem) => {
          const isActive = isAuthNavItemActive(pathWithoutLocale, navItem);
          const Icon = navItem.icon;

          return (
            <Link
              key={navItem.href}
              href={navItem.href}
              className={cn(
                "flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors",
                isActive
                  ? "bg-[var(--apple-separator)] text-[var(--apple-link)]"
                  : "text-[var(--apple-text-secondary)] hover:bg-[var(--apple-fill-tertiary)]",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              <span className={cn("truncate", isActive && "font-semibold")}>
                {tNav(navItem.labelKey)}
              </span>
            </Link>
          );
        })}

        {isAdmin ? (
          <Link
            href="/admin"
            className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-[var(--apple-text-secondary)] transition-colors hover:bg-[var(--apple-fill-tertiary)]"
          >
            <span className="flex size-5 shrink-0 items-center justify-center" aria-hidden>
              🛡
            </span>
            <span className="truncate">Admin</span>
          </Link>
        ) : null}
      </nav>

      {/* Logout at bottom */}
      <div className="shrink-0 border-t border-[var(--apple-separator)] px-2 py-2">
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-[var(--apple-text-secondary)] transition-colors hover:bg-[var(--apple-fill-tertiary)]"
        >
          <LogoutIcon className="size-5 shrink-0" aria-hidden />
          <span className="truncate">{tNav("logout")}</span>
        </button>
      </div>
    </aside>
  );
}
