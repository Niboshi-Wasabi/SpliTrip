"use client";

/**
 * Shared "upgrade to PRO" dialog trigger for paywalled actions (OCR, CSV, PDF).
 * PRO へ誘導するモーダルを、グループ画面内の複数コンポーネントから開くための Context。
 */

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

export type UpgradeModalContextValue = {
  hasPremiumAccess: boolean;
  /** null = PRO (unlimited OCR). Number = free tier remaining OCR uses. */
  freeOcrRemaining: number | null;
  openUpgradeModal: () => void;
};

const UpgradeModalContext = createContext<UpgradeModalContextValue | null>(
  null,
);

export function UpgradeModalProvider({
  children,
  hasPremiumAccess,
  freeOcrRemaining,
  openUpgradeModal,
}: {
  children: ReactNode;
  hasPremiumAccess: boolean;
  freeOcrRemaining: number | null;
  openUpgradeModal: () => void;
}) {
  const value = useMemo(
    () =>
      ({
        hasPremiumAccess,
        freeOcrRemaining,
        openUpgradeModal,
      }) satisfies UpgradeModalContextValue,
    [hasPremiumAccess, freeOcrRemaining, openUpgradeModal],
  );

  return (
    <UpgradeModalContext.Provider value={value}>
      {children}
    </UpgradeModalContext.Provider>
  );
}

export function useUpgradeModal(): UpgradeModalContextValue {
  const context = useContext(UpgradeModalContext);
  if (!context) {
    throw new Error(
      "useUpgradeModal must be used within UpgradeModalProvider",
    );
  }
  return context;
}
