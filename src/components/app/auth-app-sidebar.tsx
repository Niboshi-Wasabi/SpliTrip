"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
  isCollapsed: boolean;
  sidebarWidth: number;
  onToggleCollapsed: () => void;
};

export function AuthAppSidebar({
  displayName,
  avatarUrl,
  isAdmin,
  isCollapsed,
  sidebarWidth,
  onToggleCollapsed,
}: AuthAppSidebarProps) {
  const pathname = usePathname();
  const pathWithoutLocale = stripLocaleFromPathname(pathname);
  const router = useRouter();
  const tNav = useTranslations("BottomNav");
  const tAppShell = useTranslations("AppShell");

  const handleLogout = useCallback(async () => {
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.refresh();
    router.push("/");
  }, [router]);

  const LogoutIcon = AUTH_NAV_LOGOUT_ITEM.icon;
  const SidebarToggleIcon = isCollapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <aside
      className="relative hidden h-full shrink-0 flex-col border-r border-[var(--apple-separator)] bg-[var(--apple-surface)] md:flex"
      style={{
        width: sidebarWidth,
        transition: "width 260ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Account header */}
      <div
        className={cn(
          "flex h-[48px] shrink-0 items-center border-b border-[var(--apple-separator)]",
          isCollapsed ? "justify-center px-2" : "gap-2.5 px-4",
        )}
      >
        <UserAvatar displayName={displayName} avatarUrl={avatarUrl} size="sm" />
        {!isCollapsed ? (
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--apple-text)]">
            {displayName || "Account"}
          </p>
        ) : null}
      </div>

      {/* Navigation */}
      <nav
        className={cn(
          "flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden py-3",
          isCollapsed ? "px-1.5" : "px-2",
        )}
        aria-label={tNav("ariaLabel")}
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          className={cn(
            "flex min-h-[44px] w-full items-center rounded-xl px-3 text-[15px] font-medium text-[var(--apple-text-secondary)] transition-colors hover:bg-[var(--apple-fill-tertiary)] hover:text-[var(--apple-text)]",
            isCollapsed ? "justify-center" : "gap-3",
          )}
          aria-label={
            isCollapsed
              ? tAppShell("expandSidebar")
              : tAppShell("collapseSidebar")
          }
          title={
            isCollapsed
              ? tAppShell("expandSidebar")
              : tAppShell("collapseSidebar")
          }
        >
          <SidebarToggleIcon className="size-5 shrink-0" aria-hidden />
          {!isCollapsed ? (
            <span className="truncate">
              {isCollapsed
                ? tAppShell("expandSidebar")
                : tAppShell("collapseSidebar")}
            </span>
          ) : null}
        </button>

        {AUTH_NAV_ITEMS.map((navItem) => {
          const isActive = isAuthNavItemActive(pathWithoutLocale, navItem);
          const Icon = navItem.icon;

          return (
            <Link
              key={navItem.href}
              href={navItem.href}
              className={cn(
                "flex min-h-[44px] w-full items-center rounded-xl px-3 text-[15px] font-medium transition-colors",
                isCollapsed ? "justify-center" : "gap-3",
                isActive
                  ? "bg-[var(--apple-separator)] text-[var(--apple-link)]"
                  : "text-[var(--apple-text-secondary)] hover:bg-[var(--apple-fill-tertiary)]",
              )}
              aria-current={isActive ? "page" : undefined}
              title={isCollapsed ? tNav(navItem.labelKey) : undefined}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              {!isCollapsed ? (
                <span className={cn("truncate", isActive && "font-semibold")}>
                  {tNav(navItem.labelKey)}
                </span>
              ) : null}
            </Link>
          );
        })}

        {isAdmin ? (
          <Link
            href="/admin"
            className={cn(
              "flex min-h-[44px] w-full items-center rounded-xl px-3 text-[15px] font-medium text-[var(--apple-text-secondary)] transition-colors hover:bg-[var(--apple-fill-tertiary)]",
              isCollapsed ? "justify-center" : "gap-3",
            )}
            title={isCollapsed ? "Admin" : undefined}
          >
            <span className="flex size-5 shrink-0 items-center justify-center" aria-hidden>
              🛡
            </span>
            {!isCollapsed ? <span className="truncate">Admin</span> : null}
          </Link>
        ) : null}
      </nav>

      {/* Logout at bottom */}
      <div className="shrink-0 border-t border-[var(--apple-separator)] px-2 py-2">
        <button
          type="button"
          onClick={() => void handleLogout()}
          className={cn(
            "flex min-h-[44px] w-full items-center rounded-xl px-3 text-[15px] font-medium text-[var(--apple-text-secondary)] transition-colors hover:bg-[var(--apple-fill-tertiary)]",
            isCollapsed ? "justify-center" : "gap-3",
          )}
          title={isCollapsed ? tNav("logout") : undefined}
        >
          <LogoutIcon className="size-5 shrink-0" aria-hidden />
          {!isCollapsed ? (
            <span className="truncate">{tNav("logout")}</span>
          ) : null}
        </button>
      </div>
    </aside>
  );
}
