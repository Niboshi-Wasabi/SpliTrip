"use client";

/**
 * Wraps group export toolbar + expense panel with upgrade modal state and context.
 * エクスポート・OCR のペイウォール用にモーダル状態と Context をまとめる。
 */

import { useCallback, useState, type ReactNode } from "react";
import { UpgradeModalProvider } from "./upgrade-modal-context";
import { UpgradeModal } from "./UpgradeModal";

export function GroupPremiumShell({
  children,
  currentUserId,
  hasPremiumAccess,
  freeOcrRemaining,
}: {
  children: ReactNode;
  currentUserId: string | null;
  hasPremiumAccess: boolean;
  freeOcrRemaining: number | null;
}) {
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const openUpgradeModal = useCallback(() => {
    setUpgradeModalOpen(true);
  }, []);

  return (
    <UpgradeModalProvider
      currentUserId={currentUserId}
      hasPremiumAccess={hasPremiumAccess}
      freeOcrRemaining={freeOcrRemaining}
      openUpgradeModal={openUpgradeModal}
    >
      {children}
      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
      />
    </UpgradeModalProvider>
  );
}
