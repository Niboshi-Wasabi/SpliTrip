"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import {
  Activity,
  ArrowLeft,
  Clock3,
  FileText,
  History,
  LayoutGrid,
  LifeBuoy,
  Settings2,
} from "lucide-react";
import { AdminDataProvider, preloadAdminResources } from "@/components/admin/admin-data-provider";
import { useEffect, useCallback } from "react";
import { APPLE_NAV_TITLE_CLASS } from "@/lib/ui/apple-design";

const NAV = [
  {
    href: "/admin" as const,
    key: "navUsers" as const,
    icon: LayoutGrid,
  },
  {
    href: "/admin/announcements" as const,
    key: "navAnnouncements" as const,
    icon: FileText,
  },
  {
    href: "/admin/maintenance" as const,
    key: "navMaintenance" as const,
    icon: Clock3,
  },
  {
    href: "/admin/status" as const,
    key: "navSystemStatus" as const,
    icon: Activity,
  },
  {
    href: "/admin/system" as const,
    key: "navSystem" as const,
    icon: Settings2,
  },
  {
    href: "/admin/audit-logs" as const,
    key: "navAudit" as const,
    icon: History,
  },
  {
    href: "/admin/support" as const,
    key: "navSupport" as const,
    icon: LifeBuoy,
  },
] as const;

type Props = { children: React.ReactNode };

function AdminAppShellContent({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const translations = useTranslations("Admin");

  useEffect(() => {
    preloadAdminResources();
  }, []);

  const handleTabHover = useCallback((href: string) => {
    router.prefetch(href);
  }, [router]);

  return (
    <div className="min-h-svh bg-[var(--apple-bg)] font-sans text-[var(--apple-text)]">
      <header className="sticky top-0 z-30 h-[48px] border-b border-[var(--apple-separator)] bg-[var(--apple-nav-bg)] backdrop-blur-xl">
        <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ variant: "outline", size: "icon" }),
                "shrink-0 min-h-[44px] min-w-[44px] rounded-full border-[var(--apple-separator)]",
              )}
              aria-label={translations("backDashboard")}
              prefetch={true}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className={cn(APPLE_NAV_TITLE_CLASS, "min-w-0 flex-1 truncate")}>
              {translations("title")}
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:flex-row md:py-8">
        <aside className="w-full shrink-0 md:w-[240px]">
          <nav
            className="flex flex-wrap gap-1 md:flex-col md:gap-0.5"
            aria-label={translations("adminNavAria")}
          >
            {NAV.map(({ href, key, icon: Icon }) => {
              const active =
                href === "/admin"
                  ? pathname === "/admin" || pathname === "/admin/"
                  : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch={true}
                  onMouseEnter={() => handleTabHover(href)}
                  className={cn(
                    "inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 font-sans text-sm font-medium transition-colors",
                    active
                      ? "bg-[var(--apple-fill-tertiary)] text-[var(--apple-link)]"
                      : "text-[var(--apple-text-secondary)] hover:bg-[var(--apple-fill-tertiary)]",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {translations(key)}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-h-[40vh] flex-1 transition-opacity duration-200">
          {children}
        </main>
      </div>
    </div>
  );
}

export function AdminAppShell({ children }: Props) {
  return (
    <AdminDataProvider>
      <AdminAppShellContent>{children}</AdminAppShellContent>
    </AdminDataProvider>
  );
}
