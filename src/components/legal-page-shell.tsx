/**
 * 利用規約・プライバシーポリシー共通の読みやすいレイアウト。
 * Shared layout shell for Terms / Privacy pages with readable typography.
 *
 * prose-like スタイリングを Tailwind ユーティリティで直接行う（@tailwindcss/typography 不使用）。
 * Since @tailwindcss/typography is not installed, we replicate readable styles with utility classes.
 */

import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { LogoMark } from "@/components/logo-mark";

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
    <div className="min-h-screen">
      <header className="border-b border-[var(--apple-separator)] bg-[var(--apple-card-bg)] shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-[var(--apple-text-secondary)] transition-colors hover:text-[var(--apple-text)]"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
          <div className="ml-auto flex items-center text-[var(--apple-text)]">
            <LogoMark className="text-base md:text-lg" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--apple-text)]">
          {title}
        </h1>
        <p className="mt-1 text-sm text-[var(--apple-text-secondary)]">{lastUpdated}</p>

        <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-[var(--apple-text)]/90">
          {children}
        </div>
      </main>
    </div>
  );
}
