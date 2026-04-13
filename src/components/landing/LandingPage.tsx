"use client";

import { motion } from "framer-motion";
import Typewriter from "typewriter-effect";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button-variants";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { cn } from "@/lib/utils";
import { ArrowRightLeft, Receipt, Split } from "lucide-react";

export function LandingPage() {
  const t = useTranslations("LandingV2");
  const phrasesRaw = t.raw("hero.typewriterPhrases");
  const typewriterPhrases = Array.isArray(phrasesRaw)
    ? phrasesRaw.filter((phrase): phrase is string => typeof phrase === "string")
    : [t("hero.titleTail")];

  return (
    <div className="min-h-screen bg-lp-navy text-lp-text">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-lp-navy/40 backdrop-blur-md">
        <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="text-2xl font-bold tracking-tight md:text-3xl">
            <span className="text-lp-mint">Spli</span>
            <span className="text-lp-coral">Trip</span>
          </Link>
          <nav className="hidden items-center gap-12 text-sm text-slate-200 md:flex">
            <a href="#features" className="transition hover:text-lp-mint">{t("nav.features")}</a>
            <a href="#pricing" className="transition hover:text-lp-mint">{t("nav.pricing")}</a>
            <a href="#about" className="transition hover:text-lp-mint">{t("nav.about")}</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-100 transition hover:text-lp-mint">
              {t("actions.login")}
            </Link>
            <span className="rounded-xl bg-lp-mint px-3 py-1 text-[10px] font-bold tracking-widest text-lp-navy uppercase">
              BETA
            </span>
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col px-4 pb-24 md:px-6">
        <section className="flex flex-col items-center py-24 text-center md:py-32">
          <p className="mb-8 text-xs font-semibold tracking-widest text-lp-mint uppercase">
            {t("hero.kicker")}
          </p>
          <h1 className="max-w-5xl text-5xl font-bold tracking-tight leading-tight md:text-7xl md:leading-none">
            <span className="text-lp-mint">{t("hero.titleLead")}</span>{" "}
            <span className="text-lp-coral">
              <Typewriter
                onInit={(typewriter) => {
                  for (const phrase of typewriterPhrases) {
                    typewriter.typeString(phrase).pauseFor(1300).deleteAll(18);
                  }
                  typewriter.start();
                }}
                options={{
                  loop: typewriterPhrases.length > 1,
                  cursor: "_",
                  delay: 38,
                  deleteSpeed: 18,
                  skipAddStyles: true,
                  wrapperClassName: "inline",
                  cursorClassName: "ml-1 animate-pulse",
                }}
              />
            </span>
          </h1>
          <p className="mt-10 max-w-3xl text-base leading-relaxed text-lp-muted md:text-lg">
            {t("hero.description")}
          </p>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-12 rounded-full border border-white/10 bg-lp-mint px-10 py-6 text-sm font-bold tracking-wide text-lp-navy shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]",
            )}
          >
            {t("hero.cta")}
          </Link>
        </section>

        <section id="features" className="relative mt-6 flex justify-center py-24 md:py-32">
          <div className="pointer-events-none absolute -top-2 z-20 rounded-full border border-white/10 bg-lp-mint px-8 py-2 text-[10px] font-bold tracking-widest text-lp-navy uppercase shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            {t("mock.betaBanner")}
          </div>

          <div className="relative z-10 h-[560px] w-[290px] rounded-[2.8rem] border border-white/10 bg-slate-800/70 p-3 shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
            <div className="h-full rounded-[2.2rem] border border-white/10 bg-gradient-to-b from-slate-800 to-slate-900 p-5">
              <div className="mb-6 h-2 w-20 rounded-full bg-white/20" />
              <div className="space-y-3">
                <div className="h-16 rounded-2xl bg-white/10" />
                <div className="h-20 rounded-2xl bg-lp-mint/20" />
                <div className="h-24 rounded-2xl bg-lp-coral/20" />
                <div className="h-16 rounded-2xl bg-white/10" />
              </div>
            </div>
          </div>

          <article className="absolute -left-1 top-16 z-20 w-56 rounded-2xl border border-white/10 bg-white/90 p-4 text-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur md:-left-12">
            <div className="mb-2 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-lp-coral" />
              <p className="text-sm font-semibold">{t("cards.receipt.title")}</p>
            </div>
            <p className="text-xs text-slate-600">{t("cards.receipt.body")}</p>
          </article>

          <article className="absolute -right-1 top-44 z-20 w-56 rounded-2xl border border-white/10 bg-white/90 p-4 text-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur md:-right-12">
            <div className="mb-2 flex items-center gap-2">
              <Split className="h-4 w-4 text-lp-mint" />
              <p className="text-sm font-semibold">{t("cards.split.title")}</p>
            </div>
            <p className="text-xs text-slate-600">{t("cards.split.body")}</p>
          </article>

          <article className="absolute bottom-4 z-20 w-60 rounded-2xl border border-white/10 bg-white/90 p-4 text-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur">
            <div className="mb-2 flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-lp-coral" />
              <p className="text-sm font-semibold">{t("cards.debts.title")}</p>
            </div>
            <p className="text-xs text-slate-600">{t("cards.debts.body")}</p>
          </article>
        </section>

        <section id="pricing" className="py-24 text-center md:py-32">
          <h2 className="text-4xl font-semibold tracking-tight leading-tight text-lp-text md:text-5xl">{t("pricing.title")}</h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-lp-muted">
            {t("pricing.body")}
          </p>
        </section>

        <section id="about" className="py-24 text-center md:py-32">
          <h2 className="text-4xl font-semibold tracking-tight leading-tight text-lp-text md:text-5xl">{t("about.title")}</h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-lp-muted">
            {t("about.body")}
          </p>
        </section>
      </main>
    </div>
  );
}
