"use client";

import { AuthAppSidebar } from "@/components/app/auth-app-sidebar";
import { AuthAppMobileNav } from "@/components/app/auth-app-mobile-nav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoMark } from "@/components/logo-mark";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

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
  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--apple-bg)] text-[var(--apple-text)]">
      <AuthAppSidebar
        displayName={displayName}
        avatarUrl={avatarUrl}
        isAdmin={isAdmin}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Compact header: visible on all sizes */}
        <header className="sticky top-0 z-30 flex h-[48px] shrink-0 items-center border-b border-[var(--apple-separator)] bg-[var(--apple-nav-bg)] backdrop-blur-xl">
          <div className="flex w-full items-center justify-between gap-3 px-4">
            <LogoMark className="text-lg md:hidden" />
            <div className="hidden md:block" />
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
