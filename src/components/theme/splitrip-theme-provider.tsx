"use client";

/**
 * Theme context without an inline `<script>` (React 19 rejects scripts in client component output).
 * インライン `<script>` を出さないテーマ Context（React 19 はクライアント出力内の script を扱わない）。
 *
 * Why fork next-themes: upstream `ThemeProvider` always renders a blocking script child; we inject the same logic via `next/script` in the layout.
 * 理由: 本家は常に script 子を描画するため、同等ロジックはレイアウトの `next/script` に寄せる。
 *
 * Blocking paint sync lives in `public/theme-bootstrap.js` + `[locale]/layout.tsx` (`<script src>` avoids React 19 inline-script warnings).
 * 描画前同期は `public/theme-bootstrap.js` とレイアウトの `<script src>`（React 19 のインライン script 警告回避）。
 */

import * as React from "react";

const MEDIA = "(prefers-color-scheme: dark)";

export type SplitripThemeContextValue = {
  theme: string | undefined;
  setTheme: React.Dispatch<React.SetStateAction<string>>;
  forcedTheme?: string;
  resolvedTheme: string | undefined;
  themes: string[];
  systemTheme?: "dark" | "light";
};

const ThemeContext = React.createContext<SplitripThemeContextValue | undefined>(
  undefined,
);

function readSystem(mql?: MediaQueryList): "dark" | "light" {
  const mq = mql ?? window.matchMedia(MEDIA);
  return mq.matches ? "dark" : "light";
}

function readStored(storageKey: string, fallback: string): string {
  if (typeof window === "undefined") {
    return fallback;
  }
  try {
    return localStorage.getItem(storageKey) ?? fallback;
  } catch {
    return fallback;
  }
}

function disableTransitions(nonce?: string) {
  const el = document.createElement("style");
  if (nonce) {
    el.setAttribute("nonce", nonce);
  }
  el.appendChild(
    document.createTextNode(
      "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}",
    ),
  );
  document.head.appendChild(el);
  return () => {
    window.getComputedStyle(document.body);
    setTimeout(() => document.head.removeChild(el), 1);
  };
}

type Attribute = "class" | `data-${string}`;

export type SplitripThemeProviderProps = {
  children: React.ReactNode;
  forcedTheme?: string;
  disableTransitionOnChange?: boolean;
  enableSystem?: boolean;
  enableColorScheme?: boolean;
  storageKey?: string;
  themes?: string[];
  defaultTheme?: string;
  attribute?: Attribute | Attribute[];
  value?: Record<string, string>;
  nonce?: string;
};

export function SplitripThemeProvider({
  children,
  forcedTheme,
  disableTransitionOnChange = false,
  enableSystem = true,
  enableColorScheme = true,
  storageKey = "theme",
  themes = ["light", "dark"],
  defaultTheme: defaultThemeProp,
  attribute = "data-theme",
  value,
  nonce,
}: SplitripThemeProviderProps) {
  const defaultTheme = defaultThemeProp ?? (enableSystem ? "system" : "light");
  /**
   * Start from `defaultTheme` on both server and client so hydration matches; sync storage in `useLayoutEffect`.
   * サーバー・クライアントで同じ初期値にし、ハイドレーション後 `useLayoutEffect` で storage と揃える。
   *
   * Why: `readStored` on the client during `useState` init would diverge from SSR; layout bootstrap script already fixed `html` class.
   * 理由: クライアントだけ storage を読むと SSR とずれる。`html` の class は先にブートストラップ済み。
   */
  const [theme, setThemeState] = React.useState<string>(defaultTheme);
  const [systemResolved, setSystemResolved] =
    React.useState<"dark" | "light">("light");

  React.useLayoutEffect(() => {
    const stored = readStored(storageKey, defaultTheme);
    setThemeState(stored);
    setSystemResolved(readSystem());
  }, [defaultTheme, storageKey]);

  const attrList = React.useMemo(
    () => (Array.isArray(attribute) ? attribute : [attribute]),
    [attribute],
  );
  const themeClassNames = React.useMemo(
    () => (value ? Object.values(value) : themes),
    [themes, value],
  );

  const applyToDocument = React.useCallback(
    (themeSetting: string) => {
      if (!themeSetting) {
        return;
      }
      let domTheme = themeSetting;
      if (themeSetting === "system" && enableSystem) {
        domTheme = readSystem();
      }
      const attrValue = value ? value[domTheme] : domTheme;
      const endTransitions = disableTransitionOnChange
        ? disableTransitions(nonce)
        : null;
      const root = document.documentElement;

      for (const attr of attrList) {
        if (attr === "class") {
          root.classList.remove(...themeClassNames);
          if (attrValue) {
            root.classList.add(attrValue);
          }
        } else if (String(attr).startsWith("data-")) {
          if (attrValue) {
            root.setAttribute(attr, attrValue);
          } else {
            root.removeAttribute(attr);
          }
        }
      }

      if (enableColorScheme) {
        const fallback =
          defaultTheme === "light" || defaultTheme === "dark"
            ? defaultTheme
            : null;
        const scheme =
          domTheme === "light" || domTheme === "dark"
            ? domTheme
            : fallback;
        if (scheme === "light" || scheme === "dark") {
          root.style.colorScheme = scheme;
        }
      }

      endTransitions?.();
    },
    [
      attrList,
      defaultTheme,
      disableTransitionOnChange,
      enableColorScheme,
      enableSystem,
      nonce,
      themeClassNames,
      value,
    ],
  );

  const setTheme = React.useCallback(
    (next: React.SetStateAction<string>) => {
      setThemeState((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        try {
          localStorage.setItem(storageKey, resolved);
        } catch {
          /* ignore */
        }
        return resolved;
      });
    },
    [storageKey],
  );

  React.useEffect(() => {
    const mq = window.matchMedia(MEDIA);
    const listener = () => {
      const next = readSystem(mq);
      setSystemResolved(next);
      if (theme === "system" && enableSystem && !forcedTheme) {
        applyToDocument("system");
      }
    };
    listener();
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, [applyToDocument, enableSystem, forcedTheme, theme]);

  React.useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== storageKey) {
        return;
      }
      setThemeState(e.newValue ?? defaultTheme);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [defaultTheme, storageKey]);

  React.useEffect(() => {
    applyToDocument(forcedTheme ?? theme);
  }, [applyToDocument, forcedTheme, theme]);

  const resolvedTheme = theme === "system" ? systemResolved : theme;

  const contextValue = React.useMemo(
    () => ({
      theme,
      setTheme,
      forcedTheme,
      resolvedTheme,
      themes: enableSystem ? [...themes, "system"] : themes,
      systemTheme: enableSystem ? systemResolved : undefined,
    }),
    [
      enableSystem,
      forcedTheme,
      resolvedTheme,
      setTheme,
      systemResolved,
      theme,
      themes,
    ],
  );

  return (
    <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): SplitripThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (ctx === undefined) {
    throw new Error("useTheme must be used within SplitripThemeProvider");
  }
  return ctx;
}
