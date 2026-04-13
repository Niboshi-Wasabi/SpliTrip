"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button-variants";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { cn } from "@/lib/utils";
import { ArrowRightLeft, Receipt, Split } from "lucide-react";

export function LandingPage() {
  const t = useTranslations("LandingV2");

  return (
    <div className="min-h-screen bg-[#161e2e] text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#161e2e]/40 backdrop-blur-md">
        <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="text-2xl font-bold tracking-tight md:text-3xl">
            <span className="text-[#86D2AC]">Spli</span>
            <span className="text-[#F28C68]">Trip</span>
          </Link>
          <nav className="hidden items-center gap-12 text-sm text-slate-200 md:flex">
            <a href="#features" className="transition hover:text-[#86D2AC]">{t("nav.features")}</a>
            <a href="#pricing" className="transition hover:text-[#86D2AC]">{t("nav.pricing")}</a>
            <a href="#about" className="transition hover:text-[#86D2AC]">{t("nav.about")}</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-100 transition hover:text-[#86D2AC]">
              {t("actions.login")}
            </Link>
            <span className="rounded-xl bg-[#86D2AC] px-3 py-1 text-[10px] font-bold tracking-widest text-[#161e2e] uppercase">
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
          <p className="mb-8 text-xs font-semibold tracking-widest text-[#86D2AC] uppercase">
            {t("hero.kicker")}
          </p>
          <h1 className="max-w-5xl text-5xl font-bold tracking-tight leading-tight md:text-7xl md:leading-none">
            <span className="text-[#86D2AC]">{t("hero.titleLead")}</span>{" "}
            <span className="text-[#F28C68]">{t("hero.titleTail")}</span>
          </h1>
          <p className="mt-10 max-w-3xl text-base leading-relaxed text-lp-muted md:text-lg">
            {t("hero.description")}
          </p>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-12 rounded-full border border-white/10 bg-[#86D2AC] px-10 py-6 text-sm font-bold tracking-wide text-[#161e2e] shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 hover:bg-[#95dbb8] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]",
            )}
          >
            {t("hero.cta")}
          </Link>
        </section>

        <section id="features" className="relative mt-6 flex justify-center py-24 md:py-32">
          <div className="pointer-events-none absolute -top-2 z-20 rounded-full border border-white/10 bg-[#86D2AC] px-8 py-2 text-[10px] font-bold tracking-widest text-[#161e2e] uppercase shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            {t("mock.betaBanner")}
          </div>

          <div className="relative z-10 h-[560px] w-[290px] rounded-[2.8rem] border border-white/10 bg-slate-800/70 p-3 shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
            <div className="h-full rounded-[2.2rem] border border-white/10 bg-gradient-to-b from-slate-800 to-slate-900 p-5">
              <div className="mb-6 h-2 w-20 rounded-full bg-white/20" />
              <div className="space-y-3">
                <div className="h-16 rounded-2xl bg-white/10" />
                <div className="h-20 rounded-2xl bg-[#86D2AC]/20" />
                <div className="h-24 rounded-2xl bg-[#F28C68]/20" />
                <div className="h-16 rounded-2xl bg-white/10" />
              </div>
            </div>
          </div>

          <article className="absolute -left-1 top-16 z-20 w-56 rounded-2xl border border-white/10 bg-white/90 p-4 text-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur md:-left-12">
            <div className="mb-2 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-[#F28C68]" />
              <p className="text-sm font-semibold">{t("cards.receipt.title")}</p>
            </div>
            <p className="text-xs text-slate-600">{t("cards.receipt.body")}</p>
          </article>

          <article className="absolute -right-1 top-44 z-20 w-56 rounded-2xl border border-white/10 bg-white/90 p-4 text-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur md:-right-12">
            <div className="mb-2 flex items-center gap-2">
              <Split className="h-4 w-4 text-[#86D2AC]" />
              <p className="text-sm font-semibold">{t("cards.split.title")}</p>
            </div>
            <p className="text-xs text-slate-600">{t("cards.split.body")}</p>
          </article>

          <article className="absolute bottom-4 z-20 w-60 rounded-2xl border border-white/10 bg-white/90 p-4 text-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur">
            <div className="mb-2 flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-[#F28C68]" />
              <p className="text-sm font-semibold">{t("cards.debts.title")}</p>
            </div>
            <p className="text-xs text-slate-600">{t("cards.debts.body")}</p>
          </article>
        </section>

        <section id="pricing" className="py-24 text-center md:py-32">
          <h2 className="text-4xl font-semibold tracking-tight leading-tight text-slate-100 md:text-5xl">{t("pricing.title")}</h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-slate-300">
            {t("pricing.body")}
          </p>
        </section>

        <section id="about" className="py-24 text-center md:py-32">
          <h2 className="text-4xl font-semibold tracking-tight leading-tight text-slate-100 md:text-5xl">{t("about.title")}</h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-slate-300">
            {t("about.body")}
          </p>
        </section>
      </main>
    </div>
  );
}
