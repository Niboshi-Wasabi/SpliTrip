"use client";

import { useEffect, useMemo, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { AuthAppSidebar } from "@/components/app/auth-app-sidebar";
import { AuthAppMobileNav } from "@/components/app/auth-app-mobile-nav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoMark } from "@/components/logo-mark";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useTranslations } from "next-intl";

const AUTH_SIDEBAR_COLLAPSED_STORAGE_KEY = "splitrip-auth-sidebar-collapsed";
const AUTH_SIDEBAR_EXPANDED_WIDTH = 220;
const AUTH_SIDEBAR_COLLAPSED_WIDTH = 76;

type AuthAppShellProps = {
  displayName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  children: React.ReactNode;
};

/**
 * ログイン後の共通シェル。
 * md+: 左サイドバー + メイン。  <md: メイン + BottomNav。
 */
export function AuthAppShell({
  displayName,
  avatarUrl,
  isAdmin,
  children,
}: AuthAppShellProps) {
  const tAppShell = useTranslations("AppShell");
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(
      AUTH_SIDEBAR_COLLAPSED_STORAGE_KEY,
    );
    if (storedValue === "true") {
      setIsSidebarCollapsed(true);
    }
    setHasHydrated(true);
  }, []);

  const resolvedSidebarWidth = useMemo(() => {
    if (!hasHydrated) {
      return AUTH_SIDEBAR_EXPANDED_WIDTH;
    }
    return isSidebarCollapsed
      ? AUTH_SIDEBAR_COLLAPSED_WIDTH
      : AUTH_SIDEBAR_EXPANDED_WIDTH;
  }, [hasHydrated, isSidebarCollapsed]);

  function handleToggleSidebar() {
    setIsSidebarCollapsed((previous) => {
      const nextValue = !previous;
      window.localStorage.setItem(
        AUTH_SIDEBAR_COLLAPSED_STORAGE_KEY,
        String(nextValue),
      );
      return nextValue;
    });
  }

  const SidebarToggleIcon = isSidebarCollapsed
    ? PanelLeftOpen
    : PanelLeftClose;

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--apple-bg)] text-[var(--apple-text)]">
      <AuthAppSidebar
        displayName={displayName}
        avatarUrl={avatarUrl}
        isAdmin={isAdmin}
        isCollapsed={isSidebarCollapsed}
        sidebarWidth={resolvedSidebarWidth}
        onToggleCollapsed={handleToggleSidebar}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Compact header: visible on all sizes */}
        <header className="sticky top-0 z-30 flex h-[48px] shrink-0 items-center border-b border-[var(--apple-separator)] bg-[var(--apple-nav-bg)] backdrop-blur-xl">
          <div className="flex w-full items-center justify-between gap-3 px-4">
            <LogoMark className="text-lg md:hidden" />
            <div className="hidden md:block">
              <button
                type="button"
                onClick={handleToggleSidebar}
                className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-[var(--apple-text-secondary)] transition-colors hover:bg-[var(--apple-fill-tertiary)] hover:text-[var(--apple-text)]"
                aria-label={
                  isSidebarCollapsed
                    ? tAppShell("expandSidebar")
                    : tAppShell("collapseSidebar")
                }
                title={
                  isSidebarCollapsed
                    ? tAppShell("expandSidebar")
                    : tAppShell("collapseSidebar")
                }
              >
                <SidebarToggleIcon className="size-5" aria-hidden />
              </button>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-[calc(56px+env(safe-area-inset-bottom,0px))] md:pb-0">
          {children}
        </main>
      </div>

      <AuthAppMobileNav />
    </div>
  );
}
