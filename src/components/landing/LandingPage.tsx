"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import {
  ArrowRightLeft,
  Banknote,
  Bot,
  Check,
  Languages,
  Link2,
  QrCode,
  Receipt,
  ScanText,
  ShieldCheck,
  Split,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogoMark } from "@/components/logo-mark";

export function LandingPage() {
  const t = useTranslations("LandingV2");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-zinc-900 bg-zinc-950/85 backdrop-blur-md">
        <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="text-zinc-100">
            <LogoMark />
          </Link>
          <nav className="hidden items-center gap-12 text-sm font-medium text-zinc-300 md:flex">
            <a href="#features" className="transition hover:text-zinc-100">{t("nav.features")}</a>
            <a href="#details" className="transition hover:text-zinc-100">{t("nav.details")}</a>
            <a href="#pricing" className="transition hover:text-zinc-100">{t("nav.pricing")}</a>
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
          <Badge variant="outline" className="mb-7 border-zinc-700 bg-zinc-900/70 text-[10px] tracking-widest uppercase text-zinc-300">
            {t("hero.kicker")}
          </Badge>
          <h1 className="max-w-5xl text-5xl tracking-tight md:text-7xl md:leading-none">
            <span className="block font-medium text-zinc-200">{t("hero.titleLine1")}</span>
            <span className="block font-bold text-zinc-50">{t("hero.titleLine2")}</span>
          </h1>
          <p className="mt-8 max-w-3xl text-base leading-relaxed font-normal text-zinc-400 md:text-lg">
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
          <p className="mt-3 text-xs font-light text-zinc-500">{t("hero.note")}</p>
        </section>

        <section id="features" className="border-t border-zinc-900 py-20 md:py-24">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-100 md:text-3xl">{t("bento.title")}</h2>
            <p className="mt-2 text-sm font-normal text-zinc-400">{t("bento.subtitle")}</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <Card className="border-zinc-800 bg-zinc-900/50 md:col-span-2 md:row-span-2">
              <CardContent className="p-7">
                <div className="mb-5 flex items-center gap-2">
                  <ScanText className="h-5 w-5 text-zinc-300" />
                  <p className="text-lg font-semibold tracking-tight">{t("bento.ai.title")}</p>
                </div>
                <p className="text-sm leading-7 font-normal text-zinc-300 md:text-base">
                  {t("bento.ai.body")}
                </p>
              </CardContent>
            </Card>
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-6">
                <div className="mb-3 flex items-center gap-2">
                  <Split className="h-4 w-4 text-zinc-300" />
                  <p className="text-base font-medium tracking-tight">{t("bento.split.title")}</p>
                </div>
                <p className="text-sm leading-relaxed font-normal text-zinc-400">
                  {t("bento.split.body")}
                </p>
              </CardContent>
            </Card>
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-6">
                <div className="mb-3 flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-zinc-300" />
                  <p className="text-base font-medium tracking-tight">{t("bento.optimize.title")}</p>
                </div>
                <p className="text-sm leading-relaxed font-normal text-zinc-400">
                  {t("bento.optimize.body")}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="details" className="border-t border-zinc-900 py-20 md:py-24">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100 md:text-3xl">{t("detailed.title")}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardContent className="p-5">
                <div className="mb-2 flex items-center gap-2 text-zinc-100">
                  <Languages className="h-4 w-4 text-zinc-300" />
                  <p className="font-medium tracking-tight">{t("detailed.items.global.title")}</p>
                </div>
                <p className="text-sm leading-relaxed font-normal text-zinc-400">{t("detailed.items.global.body")}</p>
              </CardContent>
            </Card>
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardContent className="p-5">
                <div className="mb-2 flex items-center gap-2 text-zinc-100">
                  <QrCode className="h-4 w-4 text-zinc-300" />
                  <p className="font-medium tracking-tight">{t("detailed.items.join.title")}</p>
                </div>
                <p className="text-sm leading-relaxed font-normal text-zinc-400">{t("detailed.items.join.body")}</p>
              </CardContent>
            </Card>
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardContent className="p-5">
                <div className="mb-2 flex items-center gap-2 text-zinc-100">
                  <Link2 className="h-4 w-4 text-zinc-300" />
                  <p className="font-medium tracking-tight">{t("detailed.items.payment.title")}</p>
                </div>
                <p className="text-sm leading-relaxed font-normal text-zinc-400">{t("detailed.items.payment.body")}</p>
              </CardContent>
            </Card>
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardContent className="p-5">
                <div className="mb-2 flex items-center gap-2 text-zinc-100">
                  <ShieldCheck className="h-4 w-4 text-zinc-300" />
                  <p className="font-medium tracking-tight">{t("detailed.items.audit.title")}</p>
                </div>
                <p className="text-sm leading-relaxed font-normal text-zinc-400">{t("detailed.items.audit.body")}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="pricing" className="border-t border-zinc-900 py-20 md:py-24">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100 md:text-3xl">{t("pricing.title")}</h2>
          <p className="mt-2 text-sm font-normal text-zinc-400">{t("pricing.subtitle")}</p>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xl font-semibold tracking-tight">{t("pricing.free.title")}</p>
                  <Badge variant="outline" className="border-zinc-700 bg-zinc-900 text-zinc-300">{t("pricing.free.badge")}</Badge>
                </div>
                <ul className="space-y-3 text-sm font-normal text-zinc-300">
                  <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-zinc-400" />{t("pricing.free.items.receipt")}</li>
                  <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-zinc-400" />{t("pricing.free.items.groups")}</li>
                  <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-zinc-400" />{t("pricing.free.items.split")}</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-zinc-700 bg-zinc-900/70">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xl font-semibold tracking-tight">{t("pricing.pro.title")}</p>
                  <Badge className="bg-zinc-50 text-zinc-900">{t("pricing.pro.badge")}</Badge>
                </div>
                <ul className="space-y-3 text-sm font-normal text-zinc-200">
                  <li className="flex items-start gap-2"><Bot className="mt-0.5 h-4 w-4 text-zinc-300" />{t("pricing.pro.items.receipt")}</li>
                  <li className="flex items-start gap-2"><Receipt className="mt-0.5 h-4 w-4 text-zinc-300" />{t("pricing.pro.items.export")}</li>
                  <li className="flex items-start gap-2"><Banknote className="mt-0.5 h-4 w-4 text-zinc-300" />{t("pricing.pro.items.advanced")}</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
