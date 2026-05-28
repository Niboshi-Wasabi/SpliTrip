"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { stripLocaleFromPathname } from "@/utils/supabase/middleware";
import {
  AUTH_NAV_ITEMS,
  isAuthNavItemActive,
} from "@/lib/app-navigation";
import { APPLE_TAB_LABEL_CLASS } from "@/lib/ui/apple-design";

export function AuthAppMobileNav() {
  const pathname = usePathname();
  const pathWithoutLocale = stripLocaleFromPathname(pathname);
  const tNav = useTranslations("BottomNav");

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--apple-separator)] bg-[var(--apple-nav-bg)] backdrop-blur-xl md:hidden"
      aria-label={tNav("ariaLabel")}
    >
      <div
        className="grid h-[56px] w-full"
        style={{
          gridTemplateColumns: `repeat(${AUTH_NAV_ITEMS.length}, minmax(0, 1fr))`,
        }}
      >
        {AUTH_NAV_ITEMS.map((navItem) => {
          const isActive = isAuthNavItemActive(pathWithoutLocale, navItem);
          const Icon = navItem.icon;

          return (
            <Link
              key={navItem.href}
              href={navItem.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-1",
                isActive
                  ? "text-[var(--apple-link)]"
                  : "text-[var(--apple-text-secondary)]",
              )}
            >
              <span className="flex size-5 items-center justify-center">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className={APPLE_TAB_LABEL_CLASS}>
                {tNav(navItem.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
