"use client";

import { motion, type Variants } from "framer-motion";
import Image from "next/image";
import Typewriter from "typewriter-effect";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button-variants";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { cn } from "@/lib/utils";

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45 },
  },
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
    },
  },
};

export function LandingHeader() {
  const landingTranslations = useTranslations("Landing");
  const betaTranslations = useTranslations("Beta");

  return (
    <header className="border-b border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/icons/source-app-icon.svg"
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 object-contain"
            priority
          />
          <p className="truncate text-sm font-semibold text-foreground">
            SpliTrip
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span
            className="rounded-md bg-teal-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm dark:bg-teal-500"
            title={betaTranslations("badgeAria")}
          >
            {betaTranslations("badge")}
          </span>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "min-h-9",
            )}
          >
            {landingTranslations("header.signIn")}
          </Link>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}

export function HeroSection() {
  const landingTranslations = useTranslations("Landing");
  const locale = useLocale();
  const prefix = landingTranslations("hero.typewriterPrefix");
  const suffix = landingTranslations("hero.typewriterSuffix");
  const headlineLabel = `${prefix} ${suffix}`.replace(/\s+/g, " ").trim();

  return (
    <motion.section
      className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-14 text-center md:py-20"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.p
        variants={fadeUpVariants}
        className="mx-auto rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
      >
        {landingTranslations("hero.badge")}
      </motion.p>
      <motion.div variants={fadeUpVariants}>
        <h1
          className="mx-auto max-w-4xl text-balance text-3xl font-bold leading-snug text-foreground md:text-4xl md:leading-tight lg:text-5xl"
          aria-label={headlineLabel}
        >
          <span className="block">{prefix}</span>
          <span className="mt-2 flex min-h-[1.35em] w-full justify-center font-semibold tracking-tight text-foreground/95 md:min-h-[1.2em]">
            <Typewriter
              key={`${locale}-${suffix.slice(0, 24)}`}
              onInit={(typewriter) => {
                typewriter.typeString(suffix).start();
              }}
              options={{
                delay: 32,
                cursor: "_",
                loop: false,
                skipAddStyles: true,
                wrapperClassName: "inline-block max-w-full text-balance text-center",
                cursorClassName:
                  "ml-0.5 inline-block align-baseline font-normal text-teal-500 animate-typewriter-caret dark:text-teal-400",
              }}
            />
          </span>
        </h1>
      </motion.div>
      <motion.p
        variants={fadeUpVariants}
        className="mx-auto max-w-2xl text-pretty text-sm text-muted-foreground md:text-base"
      >
        {landingTranslations("hero.description")}
      </motion.p>
      <motion.div
        variants={fadeUpVariants}
        className="flex flex-col items-center justify-center gap-3 sm:flex-row"
      >
        <Link
          href="/login"
          className={cn(
            buttonVariants({ size: "lg" }),
            "min-h-[44px] w-full shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:w-auto",
          )}
        >
          {landingTranslations("hero.primaryCta")}
        </Link>
        <Link
          href="/pitch"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "min-h-[44px] w-full transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md sm:w-auto",
          )}
        >
          {landingTranslations("hero.secondaryCta")}
        </Link>
      </motion.div>
    </motion.section>
  );
}
