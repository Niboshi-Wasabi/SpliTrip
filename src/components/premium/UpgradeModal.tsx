"use client";

/**
 * Paywall upsell: SpliTrip PRO benefits (placeholder checkout).
 * 課金の壁: PRO の訴求とプレースホルダーの購入ボタン。
 */

import { useTranslations } from "next-intl";
import { Check, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUpgradeModal } from "./upgrade-modal-context";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function UpgradeModal({ open, onOpenChange }: Props) {
  const premiumTranslations = useTranslations("Premium");
  const { currentUserId } = useUpgradeModal();

  function handleUpgradeClick(): void {
    const paymentLinkBase = (process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? "").trim();
    if (!paymentLinkBase) {
      console.error("NEXT_PUBLIC_STRIPE_PAYMENT_LINK is not configured");
      return;
    }
    if (!currentUserId) {
      console.error("UpgradeModal: currentUserId is missing");
      return;
    }
    try {
      const paymentUrl = new URL(paymentLinkBase);
      paymentUrl.searchParams.set("client_reference_id", currentUserId);
      paymentUrl.searchParams.set("prefilled_user_id", currentUserId);
      window.location.href = paymentUrl.toString();
    } catch (error) {
      console.error("UpgradeModal payment URL error:", error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Sparkles className="h-5 w-5" aria-hidden />
            </span>
            <DialogTitle className="text-left text-base leading-snug">
              {premiumTranslations("modalTitle")}
            </DialogTitle>
          </div>
          <DialogDescription className="text-left text-sm">
            {premiumTranslations("modalSubtitle")}
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3 rounded-lg border border-border bg-muted/30 p-3 text-sm">
          {(
            [
              "benefitOcr",
              "benefitExport",
              "benefitNoAds",
            ] as const
          ).map((benefitKey) => (
            <li key={benefitKey} className="flex gap-2">
              <Check
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-hidden
              />
              <span className="leading-snug">{premiumTranslations(benefitKey)}</span>
            </li>
          ))}
        </ul>

        <Button
          type="button"
          className="min-h-[44px] w-full md:min-h-10"
          onClick={handleUpgradeClick}
        >
          {premiumTranslations("ctaUpgradeNow")}
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          {premiumTranslations("ctaLiveHint")}
        </p>
      </DialogContent>
    </Dialog>
  );
}
