"use client";

import * as React from "react";
import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Home, Users, Settings, PieChart, LogOut } from "lucide-react";
import { OptimizedLink } from "@/components/common/optimized-link";
import { cn } from "@/lib/utils";
import { APP_SHELL_CLASS, APPLE_NAV_TITLE_CLASS } from "@/lib/ui/apple-design";
import { createClient } from "@/utils/supabase/client";
import { isSupabaseConfigured } from "@/utils/supabase/env";
import { useRouter } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

type NavItem = {
  href: string;
  icon: React.ElementType;
  labelKey: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", icon: Home, labelKey: "home" },
  { href: "/groups", icon: Users, labelKey: "groups" },
  { href: "/dashboard", icon: PieChart, labelKey: "stats" },
  { href: "/settings", icon: Settings, labelKey: "settings" },
];

type AppShellProps = {
  children: React.ReactNode;
  title?: string;
  hideDesktopSidebar?: boolean;
};

export function AppShell({ children, title, hideDesktopSidebar = false }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const translations = useTranslations("AppShell");

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
    }
    return pathname.startsWith(href);
  }

  async function handleLogout() {
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.refresh();
    router.push("/");
  }

  return (
    <div className={APP_SHELL_CLASS}>
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-[48px] items-center border-b border-[var(--apple-separator)] bg-[var(--apple-nav-bg)] px-4 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[980px] items-center justify-between">
          {title && (
            <h1 className={APPLE_NAV_TITLE_CLASS}>{title}</h1>
          )}
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[980px] flex-1 gap-0 px-4 py-6 md:gap-6 md:py-8">
        {/* Desktop Sidebar */}
        {!hideDesktopSidebar && (
          <aside className="hidden w-[200px] shrink-0 md:block">
            <nav className="sticky top-[72px] flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <OptimizedLink
                    key={item.href + item.labelKey}
                    href={item.href}
                    className={cn(
                      "flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors",
                      active
                        ? "bg-[var(--apple-fill-tertiary)] text-[var(--apple-link)]"
                        : "text-[var(--apple-text-secondary)] hover:bg-[var(--apple-fill-tertiary)] hover:text-[var(--apple-text)]",
                    )}
                  >
                    <Icon className="size-5" />
                    {translations(item.labelKey)}
                  </OptimizedLink>
                );
              })}
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-[var(--apple-text-secondary)] transition-colors hover:bg-[var(--apple-fill-tertiary)] hover:text-[var(--apple-text)]"
              >
                <LogOut className="size-5" />
                {translations("logout")}
              </button>
            </nav>
          </aside>
        )}

        {/* Main content */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--apple-separator)] bg-[var(--apple-nav-bg)] backdrop-blur-xl md:hidden"
        role="navigation"
        aria-label={translations("navigation")}
      >
        <div className="mx-auto flex h-[56px] max-w-lg items-stretch justify-around">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <OptimizedLink
                key={item.href + item.labelKey}
                href={item.href}
                className={cn(
                  "flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 transition-colors",
                  active
                    ? "text-[var(--apple-link)]"
                    : "text-[var(--apple-text-secondary)]",
                )}
              >
                <Icon className="size-5" />
                <span className="text-[11px] font-medium leading-none">
                  {translations(item.labelKey)}
                </span>
              </OptimizedLink>
            );
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}
