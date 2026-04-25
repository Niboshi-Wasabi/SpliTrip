"use client";

/**
 * Client-side providers that must wrap interactive UI (theme, etc.) below `NextIntlClientProvider`.
 * `NextIntlClientProvider` 配下でテーマなどクライアント機能を有効にするラッパー。
 *
 * Why `SplitripThemeProvider`: same behavior as legacy `next-themes` without emitting a `<script>` (React 19).
 * 理由: 旧 `next-themes` 相当だが React 19 で問題になる `<script>` をクライアントツリーに出さない。
 */
import { SplitripThemeProvider } from "@/components/theme/splitrip-theme-provider";
import { DeviceLocaleSync } from "@/components/i18n/device-locale-sync";
import { GlobalLanguagePickerFab } from "@/components/ui/language-picker-modal";
import { AppDataProvider } from "@/components/providers/app-data-provider";
import { AppPerformanceEnhancer } from "@/components/layout/app-performance-enhancer";
import { RealtimeSyncProvider } from "@/components/realtime/realtime-sync-provider";

/**
 * Alias so call sites can keep the familiar `ThemeProvider` tag without importing a missing global.
 * 馴染みの `ThemeProvider` タグを維持し、未定義参照を防ぐエイリアス。
 */
const ThemeProvider = SplitripThemeProvider;

type Props = {
  children: React.ReactNode;
};

export function AppProviders({ children }: Props) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <RealtimeSyncProvider>
        <AppDataProvider>
          {children}
          <DeviceLocaleSync />
          <GlobalLanguagePickerFab />
          <AppPerformanceEnhancer />
        </AppDataProvider>
      </RealtimeSyncProvider>
    </ThemeProvider>
  );
}
