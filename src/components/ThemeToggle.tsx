"use client";

/**
 * Theme picker: Light / Dark / System via `SplitripThemeProvider` (no direct DOM hacks).
 * `SplitripThemeProvider` でライト・ダーク・システムを選ぶ（DOM を直接いじらない）。
 *
 * Why a menu instead of cycling: explicit choices match user mental model and stay accessible.
 * 理由: 明示的な3択の方が理解しやすく、アクセシビリティも確保しやすい。
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTheme } from "@/components/theme/splitrip-theme-provider";
import { useTranslations } from "next-intl";
import { ChevronsUpDown, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ThemeChoice = "light" | "dark" | "system";

/**
 * No-op subscription: “mounted” is a fixed client vs server fact, not an external store stream.
 * 購読不要。「マウント済み」はクライアントかどうかの固定値で外部ストアのストリームではない。
 */
function emptySubscribe(): () => void {
  return () => {};
}

type ThemeTriggerIconProps = {
  mounted: boolean;
  active: ThemeChoice;
};

/**
 * Icon on the menu trigger. / メニュートリガー上のアイコン。
 *
 * Why module scope: React 19 lint forbids nested function components recreated each render.
 * 理由: ネストした関数コンポーネントは毎レンダー再生成となり React 19 の lint に抵触する。
 *
 * Why defer real icon until `mounted`: `useTheme()` can resolve differently on server vs first client paint (hydration mismatch).
 * 理由: `useTheme()` は SSR とクライアント初回で食い違い、Moon/Monitor などがずれる。
 */
function ThemeTriggerIcon({ mounted, active }: ThemeTriggerIconProps) {
  if (!mounted) {
    return <Monitor className="size-4 shrink-0" aria-hidden />;
  }
  if (active === "system") {
    return <Monitor className="size-4 shrink-0" aria-hidden />;
  }
  if (active === "dark") {
    return <Moon className="size-4 shrink-0" aria-hidden />;
  }
  return <Sun className="size-4 shrink-0" aria-hidden />;
}

export function ThemeToggle() {
  const translations = useTranslations("Theme");
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  useEffectranslations(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const active = (theme ?? "system") as ThemeChoice;

  function selectChoice(choice: ThemeChoice) {
    setTheme(choice);
    setOpen(false);
  }

  const itemClass =
    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="relative" ref={containerRef}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1 text-muted-foreground"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={translations("ariaLabel")}
        onClick={() => {
          if (!mounted) return;
          setOpen((previous) => !previous);
        }}
      >
        <ThemeTriggerIcon mounted={mounted} active={active} />
        <ChevronsUpDown className="size-3 shrink-0 opacity-60" aria-hidden />
      </Button>

      {open && mounted ? (
        <div
          role="listbox"
          aria-label={translations("ariaLabel")}
          className="absolute right-0 z-50 mt-1 min-w-[11rem] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {(
            [
              { choice: "light" as const, Icon: Sun, label: translations("light") },
              { choice: "dark" as const, Icon: Moon, label: translations("dark") },
              { choice: "system" as const, Icon: Monitor, label: translations("system") },
            ] as const
          ).map(({ choice, Icon, label }) => (
            <button
              key={choice}
              type="button"
              role="option"
              aria-selected={active === choice}
              className={cn(itemClass, active === choice && "bg-accent")}
              onClick={() => selectChoice(choice)}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
