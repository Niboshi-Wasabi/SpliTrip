"use client";

import { HeroUIProvider } from "@heroui/system";
import { ThemeProvider } from "next-themes";
import { DeviceLocaleSync } from "@/components/i18n/device-locale-sync";
import { AppDataProvider } from "@/components/providers/app-data-provider";
import { AppPerformanceEnhancer } from "@/components/layout/app-performance-enhancer";
import { RealtimeSyncProvider } from "@/components/realtime/realtime-sync-provider";

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
      <HeroUIProvider>
        <RealtimeSyncProvider>
          <AppDataProvider>
            {children}
            <DeviceLocaleSync />
            <AppPerformanceEnhancer />
          </AppDataProvider>
        </RealtimeSyncProvider>
      </HeroUIProvider>
    </ThemeProvider>
  );
}
