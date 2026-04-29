"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import {
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

const NAV = [
  {
    href: "/admin" as const,
    key: "navUsers" as const,
    icon: LayoutGrid,
    iconClass:
      "text-zinc-600 dark:text-zinc-400",
  },
  {
    href: "/admin/announcements" as const,
    key: "navAnnouncements" as const,
    icon: FileText,
    iconClass: "text-blue-600 dark:text-blue-400",
  },
  {
    href: "/admin/maintenance" as const,
    key: "navMaintenance" as const,
    icon: Clock3,
    iconClass: "text-amber-600 dark:text-amber-400",
  },
  {
    href: "/admin/system" as const,
    key: "navSystem" as const,
    icon: Settings2,
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
  {
    href: "/admin/audit-logs" as const,
    key: "navAudit" as const,
    icon: History,
    iconClass: "text-violet-600 dark:text-violet-400",
  },
  {
    href: "/admin/support" as const,
    key: "navSupport" as const,
    icon: LifeBuoy,
    iconClass: "text-orange-600 dark:text-orange-400",
  },
] as const;

type Props = { children: React.ReactNode };

function AdminAppShellContent({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Admin");

  // 管理画面初期化時に全リソースをプリロード
  useEffect(() => {
    preloadAdminResources();
  }, []);

  // タブホバー時のプリフェッチ
  const handleTabHover = useCallback((href: string) => {
    router.prefetch(href);
  }, [router]);

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ variant: "outline", size: "icon" }),
                "shrink-0",
              )}
              aria-label={t("backDashboard")}
              prefetch={true}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {t("title")}
            </h1>
          </div>
          <ThemeToggle />
        </div>

        <nav
          className="flex flex-wrap gap-1 border-b border-border pb-0.5"
          aria-label={t("adminNavAria")}
        >
          {NAV.map(({ href, key, icon: Icon, iconClass }) => {
            const active =
              href === "/admin"
                ? pathname === "/admin" || pathname === "/admin/"
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                prefetch={true} // 事前読み込み有効化
                onMouseEnter={() => handleTabHover(href)} // ホバー時のプリフェッチ
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-t-md border border-b-0 px-3 py-2 text-sm font-medium transition-colors hover:scale-[1.02]", // 微細なホバー効果
                  active
                    ? "border-border bg-card text-foreground shadow-sm"
                    : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", iconClass)} aria-hidden />
                {t(key)}
              </Link>
            );
          })}
        </nav>

        <div className="min-h-[40vh] transition-opacity duration-200">{children}</div>
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
