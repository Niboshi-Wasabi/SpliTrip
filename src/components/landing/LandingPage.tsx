"use client";

import { motion } from "framer-motion";
import Typewriter from "typewriter-effect";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { ArrowRightLeft, Receipt, Split } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function LandingPage() {
  const t = useTranslations("LandingV2");
  const phrasesRaw = t.raw("hero.typewriterPhrases");
  const typewriterPhrases = Array.isArray(phrasesRaw)
    ? phrasesRaw.filter((phrase): phrase is string => typeof phrase === "string")
    : [t("hero.titleTail")];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
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
            <span className="text-zinc-300">
              <Typewriter
                onInit={(typewriter) => {
                  for (const phrase of typewriterPhrases) {
                    typewriter.typeString(phrase).pauseFor(1200).deleteAll(20);
                  }
                  typewriter.start();
                }}
                options={{
                  loop: typewriterPhrases.length > 1,
                  cursor: "_",
                  delay: 34,
                  deleteSpeed: 20,
                  skipAddStyles: true,
                  wrapperClassName: "inline",
                  cursorClassName: "ml-1 text-zinc-500",
                }}
              />
            </span>
          </h1>
          <p className="mt-10 max-w-3xl text-base leading-relaxed text-zinc-400 md:text-lg">
            {t("hero.description")}
          </p>
          <Link href="/login">
            <Button
              size="lg"
              className="mt-12 rounded-full bg-zinc-100 px-10 text-zinc-900 hover:bg-zinc-200"
            >
              {t("hero.cta")}
            </Button>
          </Link>
        </section>

        <section id="features" className="relative mt-6 flex justify-center py-24 md:py-32">
          <div className="pointer-events-none absolute -top-2 z-20 rounded-full border border-zinc-700 bg-zinc-900 px-8 py-2 text-[10px] font-bold tracking-widest text-zinc-200 uppercase">
            {t("mock.betaBanner")}
          </div>

          <div className="relative z-10 h-[560px] w-[290px] rounded-[2.8rem] border border-zinc-800 bg-zinc-900/70 p-3">
            <div className="h-full rounded-[2.2rem] border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-5">
              <div className="mb-6 h-2 w-20 rounded-full bg-white/20" />
              <div className="space-y-3">
                <div className="h-16 rounded-2xl bg-white/10" />
                <div className="h-20 rounded-2xl bg-zinc-800/70" />
                <div className="h-24 rounded-2xl bg-zinc-800/70" />
                <div className="h-16 rounded-2xl bg-white/10" />
              </div>
            </div>
          </div>

          <Card className="absolute -left-1 top-16 z-20 w-56 border-zinc-800 bg-zinc-900/90 text-zinc-100 shadow-none backdrop-blur md:-left-12">
            <CardContent className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-zinc-300" />
                <p className="text-sm font-semibold">{t("cards.receipt.title")}</p>
              </div>
              <p className="text-xs text-zinc-400">{t("cards.receipt.body")}</p>
            </CardContent>
          </Card>

          <Card className="absolute -right-1 top-44 z-20 w-56 border-zinc-800 bg-zinc-900/90 text-zinc-100 shadow-none backdrop-blur md:-right-12">
            <CardContent className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <Split className="h-4 w-4 text-zinc-300" />
                <p className="text-sm font-semibold">{t("cards.split.title")}</p>
              </div>
              <p className="text-xs text-zinc-400">{t("cards.split.body")}</p>
            </CardContent>
          </Card>

          <Card className="absolute bottom-4 z-20 w-60 border-zinc-800 bg-zinc-900/90 text-zinc-100 shadow-none backdrop-blur">
            <CardContent className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-zinc-300" />
                <p className="text-sm font-semibold">{t("cards.debts.title")}</p>
              </div>
              <p className="text-xs text-zinc-400">{t("cards.debts.body")}</p>
            </CardContent>
          </Card>
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
