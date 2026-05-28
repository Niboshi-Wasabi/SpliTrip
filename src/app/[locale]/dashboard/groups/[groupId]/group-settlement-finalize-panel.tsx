"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

type Props = {
  groupId: string;
  canManage: boolean;
  isFinalized: boolean;
  publicShareToken: string | null;
};

export function GroupSettlementFinalizePanel({
  groupId,
  canManage,
  isFinalized,
  publicShareToken,
}: Props) {
  const router = useRouter();
  const locale = useLocale();
  const translations = useTranslations("GroupDetail");
  const [isBusy, setIsBusy] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const settlementSharePath = useMemo(() => {
    if (!publicShareToken) {
      return "";
    }
    return `/${locale}/groups/${groupId}/shared?t=${publicShareToken}`;
  }, [groupId, locale, publicShareToken]);

  if (!canManage) {
    return null;
  }

  async function handleToggleFinalize(action: "finalize" | "reopen"): Promise<void> {
    setIsBusy(true);
    try {
      const response = await fetch(`/api/groups/${groupId}/settlement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        throw new Error("toggle_failed");
      }
      router.refresh();
    } catch {
      window.alert(translations("settlementFinalizeFailed"));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCopyShareLink(): Promise<void> {
    if (!settlementSharePath) {
      return;
    }
    try {
      const absoluteUrl = new URL(settlementSharePath, window.location.origin).toString();
      await navigator.clipboard.writeText(absoluteUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1500);
    } catch {
      window.alert(translations("shareCopyFailed"));
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-[var(--apple-separator)] p-3 print:hidden">
      <p className="text-xs text-[var(--apple-text-secondary)]">
        {isFinalized
          ? translations("settlementFinalizedHint")
          : translations("settlementFinalizeHint")}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {isFinalized ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={() => void handleToggleFinalize("reopen")}
            >
              {translations("reopenSettlement")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!settlementSharePath}
              onClick={() => void handleCopyShareLink()}
            >
              {shareCopied
                ? translations("shareCopied")
                : translations("copySettlementShareLink")}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="default"
            disabled={isBusy}
            onClick={() => void handleToggleFinalize("finalize")}
          >
            {translations("completeSettlement")}
          </Button>
        )}
      </div>
    </div>
  );
}
