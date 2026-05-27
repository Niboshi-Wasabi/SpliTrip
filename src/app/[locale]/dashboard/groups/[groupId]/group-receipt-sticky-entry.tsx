"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { GroupMemberRow } from "@/lib/group-queries";
import { useReceiptInbox } from "@/hooks/use-receipt-inbox";
import { GroupExpensePanel } from "./group-expense-panel";

type Props = {
  receiptInboxId: string;
  currentUserId: string;
  groupId: string;
  members: GroupMemberRow[];
  currencyCode: string;
  exchangeRates: Record<string, number> | null;
  groupPeriodStartDate: string | null;
  groupPeriodEndDate: string | null;
};

export function GroupReceiptStickyEntry({
  receiptInboxId,
  currentUserId,
  groupId,
  members,
  currencyCode,
  exchangeRates,
  groupPeriodStartDate,
  groupPeriodEndDate,
}: Props) {
  const receiptInboxTranslations = useTranslations("ReceiptInbox");
  const router = useRouter();
  const pathname = usePathname();
  const { findById, removeById } = useReceiptInbox(currentUserId);
  const [zoomScale, setZoomScale] = useState(1);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);

  useEffect(() => {
    async function loadTargetReceipt() {
      const item = await findById(receiptInboxId);
      setImageBlob(item?.imageBlob ?? null);
    }
    void loadTargetReceipt();
  }, [findById, receiptInboxId]);

  const imageObjectUrl = useMemo(
    () => (imageBlob ? URL.createObjectURL(imageBlob) : null),
    [imageBlob],
  );

  useEffect(() => {
    return () => {
      if (imageObjectUrl) {
        URL.revokeObjectURL(imageObjectUrl);
      }
    };
  }, [imageObjectUrl]);

  async function handleDeleteAndReturn() {
    await removeById(receiptInboxId);
    router.replace(pathname);
  }

  async function handleExpenseSaved() {
    await removeById(receiptInboxId);
    router.replace(pathname);
  }

  if (!imageObjectUrl) {
    return (
      <div className="rounded-lg border border-[var(--apple-separator)] bg-[var(--apple-card-bg)] p-4">
        <p className="text-sm text-[var(--apple-text-secondary)]">
          {receiptInboxTranslations("selectedReceiptMissing")}
        </p>
      </div>
    );
  }

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-lg border border-[var(--apple-separator)] bg-[var(--apple-card-bg)] p-3">
          <p className="text-sm font-medium">{receiptInboxTranslations("stickyViewerTitle")}</p>
          <p className="mt-1 text-xs text-[var(--apple-text-secondary)]">
            {receiptInboxTranslations("stickyViewerDescription")}
          </p>
          <label className="mt-3 block text-xs text-[var(--apple-text-secondary)]">
            {receiptInboxTranslations("zoomLabel")}
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoomScale}
              onChange={(event) => setZoomScale(Number(event.target.value))}
              className="mt-1 w-full"
            />
          </label>
        </div>
        <div className="max-h-[55vh] overflow-auto rounded-lg border border-[var(--apple-separator)] bg-black/5 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- Blob URL from local IndexedDB */}
          <img
            src={imageObjectUrl}
            alt={receiptInboxTranslations("receiptImageAlt")}
            className="mx-auto h-auto w-full origin-top rounded-md"
            style={{ transform: `scale(${zoomScale})`, touchAction: "pinch-zoom" }}
          />
        </div>
        <Button type="button" variant="outline" onClick={() => void handleDeleteAndReturn()}>
          {receiptInboxTranslations("deleteFromInbox")}
        </Button>
      </div>
      <div>
        <GroupExpensePanel
          groupId={groupId}
          members={members}
          currencyCode={currencyCode}
          exchangeRates={exchangeRates}
          currentUserId={currentUserId}
          groupPeriodStartDate={groupPeriodStartDate}
          groupPeriodEndDate={groupPeriodEndDate}
          onExpenseSaved={handleExpenseSaved}
        />
      </div>
    </section>
  );
}
