"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { ArrowRightLeft, Receipt, Split } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function LandingPage() {
  const t = useTranslations("LandingV2");

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-30 bg-zinc-950/30 backdrop-blur-md">
        <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="text-2xl font-bold tracking-tight md:text-3xl">
            <span className="text-zinc-100">Spli</span>
            <span className="text-zinc-300">Trip</span>
          </Link>
          <nav className="hidden items-center gap-12 text-sm text-zinc-300 md:flex">
            <a href="#features" className="transition hover:text-zinc-100">{t("nav.features")}</a>
            <a href="#pricing" className="transition hover:text-zinc-100">{t("nav.pricing")}</a>
            <a href="#about" className="transition hover:text-zinc-100">{t("nav.about")}</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-zinc-200 hover:bg-zinc-900 hover:text-zinc-50">
                {t("actions.login")}
              </Button>
            </Link>
            <Badge variant="secondary" className="border border-zinc-700 bg-zinc-900 text-[10px] tracking-widest uppercase text-zinc-200">
              BETA
            </Badge>
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col px-4 pb-24 md:px-6">
        <section className="flex flex-col items-center py-24 text-center md:py-32">
          <p className="mb-8 text-xs font-semibold tracking-widest text-zinc-400 uppercase">
            {t("hero.kicker")}
          </p>
          <h1 className="max-w-5xl text-5xl font-bold tracking-tight leading-tight md:text-7xl md:leading-none">
            <span className="text-zinc-100">{t("hero.titleLead")}</span>{" "}
            <span className="text-zinc-300">{t("hero.titleTail")}</span>
          </h1>
          <p className="mt-10 max-w-3xl text-base leading-relaxed text-zinc-400 md:text-lg">
            {t("hero.description")}
          </p>
          <Link href="/login">
            <Button
              size="lg"
              className="mt-12 rounded-full bg-zinc-50 px-10 text-zinc-900 hover:bg-zinc-200"
            >
              {t("hero.cta")}
            </Button>
          </Link>
        </section>

        <section id="features" className="py-24 md:py-32">
          <div className="mb-10 text-center">
            <Badge
              variant="outline"
              className="border-zinc-700 bg-zinc-900/70 px-4 py-1 text-[10px] tracking-widest uppercase text-zinc-300"
            >
              {t("mock.betaBanner")}
            </Badge>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-zinc-800 bg-white/[0.02] text-zinc-100 shadow-none backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-zinc-300" />
                  <p className="text-base font-semibold tracking-tight">
                    {t("cards.receipt.title")}
                  </p>
                </div>
                <p className="text-sm leading-relaxed text-zinc-400">
                  {t("cards.receipt.body")}
                </p>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-white/[0.02] text-zinc-100 shadow-none backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Split className="h-4 w-4 text-zinc-300" />
                  <p className="text-base font-semibold tracking-tight">
                    {t("cards.split.title")}
                  </p>
                </div>
                <p className="text-sm leading-relaxed text-zinc-400">
                  {t("cards.split.body")}
                </p>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-white/[0.02] text-zinc-100 shadow-none backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-zinc-300" />
                  <p className="text-base font-semibold tracking-tight">
                    {t("cards.debts.title")}
                  </p>
                </div>
                <p className="text-sm leading-relaxed text-zinc-400">
                  {t("cards.debts.body")}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="pricing" className="py-24 text-center md:py-32">
          <h2 className="text-4xl font-semibold tracking-tight leading-tight text-zinc-100 md:text-5xl">{t("pricing.title")}</h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-zinc-400">
            {t("pricing.body")}
          </p>
        </section>

        <section id="about" className="py-24 text-center md:py-32">
          <h2 className="text-4xl font-semibold tracking-tight leading-tight text-zinc-100 md:text-5xl">{t("about.title")}</h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-zinc-400">
            {t("about.body")}
          </p>
        </section>
      </main>
    </div>
  );
}
