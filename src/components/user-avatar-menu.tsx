"use client";

/**
 * アバター → ドロップダウン（ダッシュボード、設定、管理者パネル、ログアウト）。
 * 同パターンを LP（Landing）と通常アプリ（Dashboard）の両方で使う。スタイル差は `variant`。
 */
import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user-avatar";
import { LayoutDashboard, LogOut, Settings, ShieldCheck } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { isSupabaseConfigured } from "@/utils/supabase/env";
import { cn } from "@/lib/utils";

type Props = {
  displayName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  /** ランディングは暗色テーマ。ダッシュボード等は `app`。 */
  variant?: "app" | "landing";
  size?: "sm" | "md";
  accountAriaLabel: string;
  triggerClassName?: string;
};

export function UserAvatarMenu({
  displayName,
  avatarUrl,
  isAdmin,
  variant = "app",
  size = "md",
  accountAriaLabel,
  triggerClassName,
}: Props) {
  const router = useRouter();
  const tNav = useTranslations("BottomNav");
  const tAdmin = useTranslations("Admin");

  const isLanding = variant === "landing";
  const contentClassName = isLanding
    ? "w-48 border-zinc-800 bg-zinc-950 text-zinc-100"
    : "w-48";
  const itemClassName = "min-h-[44px] cursor-pointer";
  const iconWrapClass = isLanding ? "text-zinc-200" : undefined;

  const handleLogout = useCallback(async () => {
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.refresh();
    if (isLanding) {
      return;
    }
    router.push("/");
  }, [isLanding, router]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        aria-label={accountAriaLabel}
        className={cn(
          "shrink-0 rounded-full p-0.5 ring-1 focus:outline-none focus-visible:ring-2",
          isLanding
            ? "ring-zinc-700 focus-visible:ring-zinc-400"
            : "ring-border focus-visible:ring-ring",
          triggerClassName,
        )}
      >
        <UserAvatar
          displayName={displayName}
          avatarUrl={avatarUrl}
          size={size}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={contentClassName}>
        <DropdownMenuItem
          className={itemClassName}
          onClick={() => router.push("/dashboard")}
        >
          <LayoutDashboard
            className={cn("h-4 w-4", iconWrapClass)}
            aria-hidden
          />
          {tNav("home")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className={itemClassName}
          onClick={() => router.push("/settings")}
        >
          <Settings className={cn("h-4 w-4", iconWrapClass)} aria-hidden />
          {tNav("settings")}
        </DropdownMenuItem>
        {isAdmin ? (
          <DropdownMenuItem
            className={itemClassName}
            onClick={() => router.push("/admin")}
          >
            <ShieldCheck className={cn("h-4 w-4", iconWrapClass)} aria-hidden />
            {tAdmin("adminPanel")}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          variant="destructive"
          className={itemClassName}
          onClick={() => void handleLogout()}
        >
          <LogOut className="h-4 w-4" aria-hidden />
          {tNav("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
