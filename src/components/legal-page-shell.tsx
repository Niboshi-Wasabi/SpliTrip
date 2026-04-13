/**
 * 利用規約・プライバシーポリシー共通の読みやすいレイアウト。
 * Shared layout shell for Terms / Privacy pages with readable typography.
 *
 * prose-like スタイリングを Tailwind ユーティリティで直接行う（@tailwindcss/typography 不使用）。
 * Since @tailwindcss/typography is not installed, we replicate readable styles with utility classes.
 */

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";

type Props = {
  title: string;
  lastUpdated: string;
  backLabel: string;
  children: React.ReactNode;
};

export function LegalPageShell({
  title,
  lastUpdated,
  backLabel,
  children,
}: Props) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
          <div className="ml-auto flex items-center gap-2 text-sm font-semibold text-foreground">
            <Image
              src="/icons/source-app-icon.svg"
              alt=""
              width={24}
              height={24}
              className="h-6 w-6 shrink-0 object-contain"
            />
            SpliTrip
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{lastUpdated}</p>

        <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-foreground/90">
          {children}
        </div>
      </main>
    </div>
  );
}
