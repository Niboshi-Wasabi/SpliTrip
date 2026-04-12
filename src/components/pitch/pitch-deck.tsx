"use client";

/**
 * SpliTrip product deck — interactive full-viewport slides.
 *
 * Step 1 — Features grounded in this repo (JP / EN):
 * - 精算最小化: `src/lib/simplify-debts.ts` + `src/lib/group-ledger.ts`（グリーディ突合で送金回数削減）
 *   Settlement minimization: greedy debtor/creditor matching to reduce transfer count.
 * - 多様な割り方: `src/utils/settlement.ts` + `group-expense-panel.tsx`（equal / percent / shares / itemized 等・端数ポリシー）
 *   Rich split math: multiple modes with minor-unit remainder handling.
 * - AI レシート + Storage: `src/actions/analyzeReceipt.ts`（Gemini）+ 領収書 API / `group-expense-panel`
 *   Receipt scan via server action + stored attachments for review.
 * - 書き出し・監査: `group-export-toolbar.tsx`（CSV / PDF / print・PRO）+ 出費詳細の audit API
 *   Exports and per-expense audit timeline for accountability.
 * - 認証・招待: Google / LINE + `create-group-with-invite` / join フロー（トークン招待）
 *   Flexible auth and shareable invite links for groups.
 *
 * UI rationale — 構成の意図:
 * - Vertical `snap-mandatory` + full-height sections mimic keynote-style decks without JS carousel libs.
 * - Dark gradient + oversized Lucide marks keep a calm, product-demo tone (GenSpark / Apple-like restraint).
 * - IntersectionObserver triggers one-shot fade/slide-in so motion stays subtle and performant.
 *
 * Note: Route lives at `src/app/[locale]/pitch/page.tsx` so `next-intl` and the locale `<html>` shell apply;
 * public URLs are `/pitch` (default locale) and `/en/pitch` per `localePrefix: "as-needed"`.
 */

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeftRight,
  FileStack,
  Link as LinkIcon,
  Loader2,
  PieChart,
  ScanLine,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type PitchDeckProps = {
  /** Open-redirect-safe path after finishing (e.g. /dashboard or /onboarding?next=…). */
  afterPitchPath: string;
  /** When true, POST /api/profile/pitch-deck-seen before navigating（ログイン中のみ）。 */
  shouldPersistCompletion: boolean;
};

type PitchSlideSectionProps = {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

function PitchSlideSection({
  children,
  className,
  contentClassName,
}: PitchSlideSectionProps) {
  const sectionReference = useRef<HTMLElement | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const element = sectionReference.current;
    if (!element) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }
          setIsRevealed(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.35, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionReference}
      className={cn(
        "flex min-h-[100dvh] w-full shrink-0 snap-start snap-always flex-col justify-center",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-3xl flex-col px-6 py-20 transition-[opacity,transform] duration-[880ms] ease-[cubic-bezier(0.22,1,0.36,1)] md:px-10",
          isRevealed
            ? "translate-y-0 opacity-100"
            : "translate-y-10 opacity-0",
          contentClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

export function PitchDeck({
  afterPitchPath,
  shouldPersistCompletion,
}: PitchDeckProps) {
  const pitchDeckTranslations = useTranslations("PitchDeck");
  const locale = useLocale();
  const router = useRouter();
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  const slideDefinitions = [
    {
      icon: ArrowLeftRight,
      title: pitchDeckTranslations("slide1.title"),
      body: pitchDeckTranslations("slide1.body"),
      iconClassName: "text-sky-400/90",
    },
    {
      icon: PieChart,
      title: pitchDeckTranslations("slide2.title"),
      body: pitchDeckTranslations("slide2.body"),
      iconClassName: "text-emerald-400/90",
    },
    {
      icon: ScanLine,
      title: pitchDeckTranslations("slide3.title"),
      body: pitchDeckTranslations("slide3.body"),
      iconClassName: "text-amber-300/90",
    },
    {
      icon: FileStack,
      title: pitchDeckTranslations("slide4.title"),
      body: pitchDeckTranslations("slide4.body"),
      iconClassName: "text-violet-300/90",
    },
    {
      icon: UserPlus,
      title: pitchDeckTranslations("slide5.title"),
      body: pitchDeckTranslations("slide5.body"),
      iconClassName: "text-rose-300/90",
    },
  ];
  const finalSlide = slideDefinitions[4];

  async function finishPitch() {
    if (isFinishing) {
      return;
    }
    setFinishError(null);
    setIsFinishing(true);
    try {
      if (shouldPersistCompletion) {
        const response = await fetch("/api/profile/pitch-deck-seen", {
          method: "POST",
        });
        if (!response.ok) {
          setFinishError(pitchDeckTranslations("markSeenError"));
          setIsFinishing(false);
          return;
        }
      }
      router.push(afterPitchPath);
      router.refresh();
    } catch {
      setFinishError(pitchDeckTranslations("markSeenError"));
      setIsFinishing(false);
    }
  }

  return (
    <div
      key={locale}
      className="relative min-h-[100dvh] w-full bg-gradient-to-br from-zinc-950 via-zinc-900 to-slate-950 text-zinc-100"
    >
      <button
        type="button"
        onClick={() => void finishPitch()}
        disabled={isFinishing}
        className="fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-50 min-h-[44px] rounded-full border border-white/10 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-300 backdrop-blur-md transition hover:border-white/20 hover:bg-zinc-900/80 hover:text-white disabled:opacity-60"
      >
        {isFinishing ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          pitchDeckTranslations("backToApp")
        )}
      </button>

      {finishError ? (
        <p
          className="fixed left-4 right-4 top-[max(4rem,env(safe-area-inset-top))] z-50 mx-auto max-w-lg rounded-md border border-red-500/40 bg-red-950/60 px-3 py-2 text-center text-sm text-red-100 md:left-auto md:right-auto md:top-20"
          role="alert"
        >
          {finishError}
        </p>
      ) : null}

      <div className="h-[100dvh] w-full snap-y snap-mandatory overflow-y-auto overflow-x-hidden scroll-smooth">
        <PitchSlideSection contentClassName="items-center text-center">
          <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] shadow-[0_0_60px_-12px_rgba(59,130,246,0.45)]">
            <Sparkles
              className="h-10 w-10 text-sky-300"
              strokeWidth={1.25}
              aria-hidden
            />
          </div>
          <h1 className="font-heading text-5xl font-semibold tracking-tight text-white md:text-6xl">
            {pitchDeckTranslations("heroTitle")}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-400 md:text-xl">
            {pitchDeckTranslations("heroTagline")}
          </p>
          <p className="mt-16 text-xs font-medium uppercase tracking-[0.25em] text-zinc-500">
            {pitchDeckTranslations("heroScrollHint")}
          </p>
        </PitchSlideSection>

        {slideDefinitions.slice(0, 4).map((slideDefinition) => (
          <PitchSlideSection key={slideDefinition.title}>
            <div className="mb-10 flex justify-center md:justify-start">
              <slideDefinition.icon
                className={cn(
                  "h-24 w-24 md:h-28 md:w-28",
                  slideDefinition.iconClassName,
                )}
                strokeWidth={1}
                aria-hidden
              />
            </div>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-white md:text-4xl">
              {slideDefinition.title}
            </h2>
            <p className="mt-5 text-base leading-relaxed text-zinc-400 md:text-lg">
              {slideDefinition.body}
            </p>
          </PitchSlideSection>
        ))}

        <PitchSlideSection contentClassName="items-center pb-28 text-center md:items-start md:text-left">
          <div className="mb-10 flex w-full justify-center md:justify-start">
            <finalSlide.icon
              className="h-24 w-24 text-rose-300/90 md:h-28 md:w-28"
              strokeWidth={1}
              aria-hidden
            />
          </div>
          <h2 className="font-heading w-full text-3xl font-semibold tracking-tight text-white md:text-4xl">
            {finalSlide.title}
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
            {finalSlide.body}
          </p>
          <div className="mt-12 flex w-full flex-col items-center gap-4 sm:flex-row sm:justify-center md:justify-start">
            <button
              type="button"
              onClick={() => void finishPitch()}
              disabled={isFinishing}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-8 py-3 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-60"
            >
              {isFinishing ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : (
                pitchDeckTranslations("ctaDashboard")
              )}
            </button>
            <span className="inline-flex items-center gap-2 text-sm text-zinc-500">
              <LinkIcon className="h-4 w-4" aria-hidden />
              {pitchDeckTranslations("ctaHint")}
            </span>
          </div>
        </PitchSlideSection>
      </div>
    </div>
  );
}
