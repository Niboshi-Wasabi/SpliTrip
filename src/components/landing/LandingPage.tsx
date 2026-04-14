"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import {
  Banknote,
  Bot,
  Check,
  HandCoins,
  ImageUp,
  Languages,
  LayoutDashboard,
  Link2,
  QrCode,
  Radio,
  Receipt,
  Scale,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogoMark } from "@/components/logo-mark";

export function LandingPage() {
  const t = useTranslations("LandingV2");
  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: "easeOut" as const },
    },
  };
  const staggerContainer = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.12,
      },
    },
  };
  const cardHoverClass =
    "transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(255,255,255,0.04)]";

  const bentoCards = [
    { id: "receiptStorage" as const, Icon: ImageUp },
    { id: "realtime" as const, Icon: Radio },
    { id: "nextPayerHint" as const, Icon: HandCoins },
    { id: "roundingPolicies" as const, Icon: Scale },
    { id: "dashboardSummary" as const, Icon: LayoutDashboard },
    { id: "publicReadOnlyShare" as const, Icon: Share2 },
  ];

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
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <Badge variant="outline" className="mb-7 border-zinc-700 bg-zinc-900/70 text-[10px] tracking-widest uppercase text-zinc-300">
              {t("hero.kicker")}
            </Badge>
          </motion.div>
          <motion.h1
            className="max-w-5xl text-5xl tracking-tight md:text-7xl md:leading-none"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ duration: 0.75, delay: 0.08, ease: "easeOut" }}
          >
            <span className="block font-medium text-zinc-200">{t("hero.titleLine1")}</span>
            <span className="block font-bold text-zinc-50">{t("hero.titleLine2")}</span>
          </motion.h1>
          <motion.p
            className="mt-8 max-w-3xl text-base leading-relaxed font-normal text-zinc-400 md:text-lg"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          >
            {t("hero.description")}
          </motion.p>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ duration: 0.65, delay: 0.32, ease: "easeOut" }}
          >
            <Link href="/login">
              <Button
                size="lg"
                className="mt-12 rounded-full bg-zinc-50 px-10 text-zinc-900 hover:bg-zinc-200"
              >
                {t("hero.cta")}
              </Button>
            </Link>
          </motion.div>
        </section>

        <motion.section
          id="features"
          className="border-t border-zinc-900 py-20 md:py-24"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
        >
          <motion.div className="mb-8" variants={fadeUp}>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-100 md:text-3xl">{t("bento.title")}</h2>
            <p className="mt-2 text-sm font-normal text-zinc-400">{t("bento.subtitle")}</p>
          </motion.div>
          <motion.div
            className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer}
          >
            {bentoCards.map(({ id, Icon }) => (
              <motion.div key={id} variants={fadeUp} className="h-full">
                <Card className={`h-full min-h-0 border-zinc-800 bg-zinc-900/50 ${cardHoverClass}`}>
                  <CardContent className="flex h-full min-h-0 flex-col p-6">
                    <div className="mb-4 flex min-h-12 items-start gap-2">
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-zinc-300" aria-hidden />
                      <p className="line-clamp-2 text-base font-semibold tracking-tight text-zinc-100">
                        {t(`bento.items.${id}.title`)}
                      </p>
                    </div>
                    <p className="flex-1 text-pretty text-sm leading-relaxed font-normal text-zinc-400">
                      {t(`bento.items.${id}.body`)}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        <motion.section
          id="details"
          className="border-t border-zinc-900 py-20 md:py-24"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
        >
          <motion.h2 className="text-2xl font-bold tracking-tight text-zinc-100 md:text-3xl" variants={fadeUp}>
            {t("detailed.title")}
          </motion.h2>
          <motion.div className="mt-8 grid items-stretch gap-4 md:grid-cols-2" variants={staggerContainer}>
            <motion.div variants={fadeUp} className="h-full">
              <Card className={`h-full min-h-0 border-zinc-800 bg-zinc-900/40 ${cardHoverClass}`}>
                <CardContent className="flex h-full min-h-0 flex-col p-5">
                  <div className="mb-3 flex min-h-10 shrink-0 items-start gap-2 text-zinc-100">
                    <Languages className="mt-0.5 h-4 w-4 shrink-0 text-zinc-300" />
                    <p className="line-clamp-2 font-medium tracking-tight">{t("detailed.items.global.title")}</p>
                  </div>
                  <p className="flex-1 text-pretty text-sm leading-relaxed font-normal text-zinc-400">
                    {t("detailed.items.global.body")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={fadeUp} className="h-full">
              <Card className={`h-full min-h-0 border-zinc-800 bg-zinc-900/40 ${cardHoverClass}`}>
                <CardContent className="flex h-full min-h-0 flex-col p-5">
                  <div className="mb-3 flex min-h-10 shrink-0 items-start gap-2 text-zinc-100">
                    <QrCode className="mt-0.5 h-4 w-4 shrink-0 text-zinc-300" />
                    <p className="line-clamp-2 font-medium tracking-tight">{t("detailed.items.join.title")}</p>
                  </div>
                  <p className="flex-1 text-pretty text-sm leading-relaxed font-normal text-zinc-400">
                    {t("detailed.items.join.body")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={fadeUp} className="h-full">
              <Card className={`h-full min-h-0 border-zinc-800 bg-zinc-900/40 ${cardHoverClass}`}>
                <CardContent className="flex h-full min-h-0 flex-col p-5">
                  <div className="mb-3 flex min-h-10 shrink-0 items-start gap-2 text-zinc-100">
                    <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-zinc-300" />
                    <p className="line-clamp-2 font-medium tracking-tight">{t("detailed.items.payment.title")}</p>
                  </div>
                  <p className="flex-1 text-pretty text-sm leading-relaxed font-normal text-zinc-400">
                    {t("detailed.items.payment.body")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={fadeUp} className="h-full">
              <Card className={`h-full min-h-0 border-zinc-800 bg-zinc-900/40 ${cardHoverClass}`}>
                <CardContent className="flex h-full min-h-0 flex-col p-5">
                  <div className="mb-3 flex min-h-10 shrink-0 items-start gap-2 text-zinc-100">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-zinc-300" />
                    <p className="line-clamp-2 font-medium tracking-tight">{t("detailed.items.audit.title")}</p>
                  </div>
                  <p className="flex-1 text-pretty text-sm leading-relaxed font-normal text-zinc-400">
                    {t("detailed.items.audit.body")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </motion.section>

        <motion.section
          id="pricing"
          className="border-t border-zinc-900 py-20 md:py-24"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
        >
          <motion.h2 className="text-2xl font-bold tracking-tight text-zinc-100 md:text-3xl" variants={fadeUp}>
            {t("pricing.title")}
          </motion.h2>
          <motion.p className="mt-2 text-sm font-normal text-zinc-400" variants={fadeUp}>
            {t("pricing.subtitle")}
          </motion.p>
          <motion.div className="mt-8 grid items-stretch gap-5 md:grid-cols-2" variants={staggerContainer}>
            <motion.div variants={fadeUp} className="h-full min-h-0">
              <Card className={`h-full min-h-0 border-zinc-800 bg-zinc-900/50 ${cardHoverClass}`}>
                <CardContent className="flex h-full min-h-0 flex-col p-6">
                  <div className="mb-4 flex shrink-0 items-center justify-between">
                    <p className="text-xl font-semibold tracking-tight">{t("pricing.free.title")}</p>
                    <Badge variant="outline" className="border-zinc-700 bg-zinc-900 text-zinc-300">{t("pricing.free.badge")}</Badge>
                  </div>
                  <ul className="min-h-0 flex-1 space-y-3 text-sm font-normal text-zinc-300">
                    <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />{t("pricing.free.items.receipt")}</li>
                    <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />{t("pricing.free.items.groups")}</li>
                    <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />{t("pricing.free.items.split")}</li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={fadeUp} className="relative h-full min-h-0">
              <Card className="h-full min-h-0 pointer-events-none select-none border-zinc-700 bg-zinc-900/70 opacity-45 saturate-50">
                <CardContent className="flex h-full min-h-0 flex-col space-y-3 p-6">
                  <p className="shrink-0 text-center text-xs leading-relaxed text-zinc-500">
                    {t("pricing.pro.disclaimer")}
                  </p>
                  <div className="flex shrink-0 items-center justify-between">
                    <p className="text-xl font-semibold tracking-tight text-zinc-200">{t("pricing.pro.title")}</p>
                    <Badge className="bg-zinc-50 text-zinc-900">{t("pricing.pro.badge")}</Badge>
                  </div>
                  <ul className="min-h-0 flex-1 space-y-3 text-sm font-normal text-zinc-300">
                    <li className="flex items-start gap-2"><Bot className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />{t("pricing.pro.items.receipt")}</li>
                    <li className="flex items-start gap-2"><Receipt className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />{t("pricing.pro.items.export")}</li>
                    <li className="flex items-start gap-2"><Banknote className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />{t("pricing.pro.items.advanced")}</li>
                  </ul>
                </CardContent>
              </Card>
              <div
                role="status"
                aria-live="polite"
                className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-zinc-950/75 p-4 text-center ring-1 ring-inset ring-zinc-600/30 md:p-6"
              >
                <Badge variant="secondary" className="border border-zinc-600 bg-zinc-900 text-[10px] tracking-widest text-zinc-200 uppercase">
                  {t("pricing.proOverlay.badge")}
                </Badge>
                <p className="max-w-[16rem] text-sm font-semibold text-zinc-50 md:max-w-xs">
                  {t("pricing.proOverlay.title")}
                </p>
                <p className="max-w-[18rem] text-xs leading-relaxed text-zinc-400 md:max-w-sm">
                  {t("pricing.proOverlay.body")}
                </p>
              </div>
            </motion.div>
          </motion.div>
        </motion.section>
      </main>
    </div>
  );
}
