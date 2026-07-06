"use client";

/**
 * Settlement rows with optional payment deep links (legacy handles + `payment_links` JSON).
 * 精算行。払う側だけ送金ボタンを出す。ファビコンは取得失敗時に Wallet にフォールバック。
 *
 * Why resolve helper: keeps vendor-specific URL building out of this component.
 * 理由: ベンダー固有の URL 生成を `resolved-payment-targets` に閉じる。
 */

import { useMemo, useState } from "react";
import type { GroupMemberRow } from "@/lib/group-queries";
import type { GroupSettlement } from "@/lib/group-ledger";
import { UserAvatar } from "@/components/user-avatar";
import { formatMoneyByCurrency } from "@/lib/currency-payment-amount";
import { convertAmount } from "@/utils/exchangeRates";
import { openPaymentInNewTab } from "@/lib/payment-links";
import {
  resolvePaymentTargetsForMember,
  type ResolvedPaymentTarget,
} from "@/lib/resolved-payment-targets";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { Check, Copy, Wallet } from "lucide-react";
import confetti from "canvas-confetti";
import { buildSettlementPairKey } from "@/lib/settlement-transactions";
import { useGroupOptimisticMutations } from "@/hooks/use-group-optimistic-mutations";

type Props = {
  groupId: string;
  settlements: GroupSettlement[];
  currencyCode: string;
  currentUserId: string;
  members: GroupMemberRow[];
  /** null when no conversion needed (base currency is JPY) */
  exchangeRates: Record<string, number> | null;
};

function findMemberByUserId(
  members: GroupMemberRow[],
  userId: string,
): GroupMemberRow | undefined {
  return members.find((memberRow) => memberRow.user_id === userId);
}

function PaymentActionButton({
  target,
  labelText,
}: {
  target: ResolvedPaymentTarget;
  labelText: string;
}) {
  const [faviconBroken, setFaviconBroken] = useState(false);

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="min-h-[44px] gap-2 text-xs sm:min-h-0 sm:h-7"
      onClick={() => openPaymentInNewTab(target.paymentUrl)}
    >
      {!faviconBroken && target.faviconUrl.length > 0 ? (
        // eslint-disable-next-line @next/next/no-img-element -- external favicon URL from Google service
        <img
          src={target.faviconUrl}
          alt=""
          width={16}
          height={16}
          className="h-4 w-4 shrink-0 rounded-sm"
          onError={() => setFaviconBroken(true)}
        />
      ) : (
        <Wallet className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
      )}
      {labelText}
    </Button>
  );
}

export function GroupSettlementList({
  groupId,
  settlements,
  currencyCode,
  currentUserId,
  members,
  exchangeRates,
}: Props) {
  const settlementTranslations = useTranslations("Settlement");
  const { markSettlementOptimistically } = useGroupOptimisticMutations(groupId);
  const [optimisticPaidPairKeys, setOptimisticPaidPairKeys] = useState<
    Record<string, boolean>
  >({});
  const [copyToastMessage, setCopyToastMessage] = useState<string | null>(null);

  const currentUserMember = useMemo(
    () => findMemberByUserId(members, currentUserId),
    [currentUserId, members],
  );

  function labelForTarget(target: ResolvedPaymentTarget): string {
    return settlementTranslations(
      target.labelMessageKey as
        | "payWithPaypal"
        | "payWithCashApp"
        | "payWithPayPay"
        | "payWithLinePay"
        | "payWithVenmo"
        | "payWithGeneric",
    );
  }

  async function copySettlementRequestText(
    amount: number,
    paymentUrl: string | null,
  ): Promise<void> {
    const requestText = settlementTranslations("requestTemplate", {
      amount: formatMoneyByCurrency(currencyCode, amount),
      paymentUrl:
        paymentUrl && paymentUrl.length > 0
          ? paymentUrl
          : settlementTranslations("requestNoPaymentLink"),
    });
    try {
      await navigator.clipboard.writeText(requestText);
      setCopyToastMessage(settlementTranslations("copiedToast"));
    } catch {
      setCopyToastMessage(settlementTranslations("copiedFailedToast"));
    }
    setTimeout(() => {
      setCopyToastMessage(null);
    }, 1800);
  }

  async function handleMarkAsSettled(
    pairKey: string,
    fromUserId: string,
    toUserId: string,
    amount: number,
  ): Promise<void> {
    const markSucceeded = await markSettlementOptimistically({
      fromUserId,
      toUserId,
      amount,
      onOptimisticApplied: () => {
        setOptimisticPaidPairKeys((previousRows) => ({
          ...previousRows,
          [pairKey]: true,
        }));
      },
      onRollback: () => {
        setOptimisticPaidPairKeys((previousRows) => {
          const nextRows = { ...previousRows };
          delete nextRows[pairKey];
          return nextRows;
        });
      },
    });
    if (!markSucceeded) {
      setCopyToastMessage(settlementTranslations("markSettledFailed"));
      setTimeout(() => {
        setCopyToastMessage(null);
      }, 1800);
      return;
    }
    void confetti({
      particleCount: 42,
      spread: 62,
      origin: { y: 0.75 },
      ticks: 160,
    });
  }

  return (
    <ul className="space-y-2">
      {settlements.map((settlementRow) => {
        const pairKey = buildSettlementPairKey(
          settlementRow.fromUserId,
          settlementRow.toUserId,
        );
        const rowIsMarkedSettled =
          settlementRow.isMarkedPaid === true ||
          optimisticPaidPairKeys[pairKey] === true;
        const viewerIsDebtor = settlementRow.fromUserId === currentUserId;
        const viewerIsCreditor = settlementRow.toUserId === currentUserId;
        const debtorMember = findMemberByUserId(
          members,
          settlementRow.fromUserId,
        );
        const recipientMember = findMemberByUserId(
          members,
          settlementRow.toUserId,
        );
        const paymentTargets =
          viewerIsDebtor && recipientMember
            ? resolvePaymentTargetsForMember(
                recipientMember,
                currencyCode,
                settlementRow.amount,
              )
            : [];
        const hasPaymentTargets = paymentTargets.length > 0;
        const recipientPaymentTargets = viewerIsCreditor && currentUserMember
          ? resolvePaymentTargetsForMember(
              currentUserMember,
              currencyCode,
              settlementRow.amount,
            )
          : [];
        const requestPaymentUrl = recipientPaymentTargets[0]?.paymentUrl ?? null;

        return (
          <li
            key={pairKey}
            className="flex min-h-[44px] flex-col gap-2 rounded-lg border p-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
          >
            <span className="flex items-center gap-1.5">
              <UserAvatar
                displayName={settlementRow.fromDisplayName}
                avatarUrl={debtorMember?.avatar_url}
                size="sm"
              />
              <span className="font-medium">
                {settlementRow.fromDisplayName}
              </span>
              <span className="text-[var(--apple-text-secondary)]">→</span>
              <UserAvatar
                displayName={settlementRow.toDisplayName}
                avatarUrl={recipientMember?.avatar_url}
                size="sm"
              />
              <span className="font-medium">
                {settlementRow.toDisplayName}
              </span>
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold tabular-nums">
                {formatMoneyByCurrency(currencyCode, settlementRow.amount)}
                {exchangeRates ? (() => {
                  const jpyAmount = convertAmount(
                    settlementRow.amount,
                    currencyCode,
                    "JPY",
                    exchangeRates,
                  );
                  return jpyAmount !== null ? (
                    <span className="ml-1.5 text-xs font-normal text-[var(--apple-text-secondary)]">
                      (≈ {formatMoneyByCurrency("JPY", Math.round(jpyAmount))})
                    </span>
                  ) : null;
                })() : null}
              </span>
              {viewerIsDebtor && hasPaymentTargets ? (
                <div className="flex flex-wrap gap-1.5 print:hidden">
                  {paymentTargets.map((target) => (
                    <PaymentActionButton
                      key={`${target.paymentUrl}-${target.kind}`}
                      target={target}
                      labelText={labelForTarget(target)}
                    />
                  ))}
                  <Button
                    type="button"
                    variant={rowIsMarkedSettled ? "secondary" : "outline"}
                    size="sm"
                    className={`min-h-[44px] gap-1.5 text-xs sm:min-h-0 sm:h-7 ${
                      rowIsMarkedSettled ? "scale-[1.03]" : ""
                    }`}
                    onClick={() =>
                      void handleMarkAsSettled(
                        pairKey,
                        settlementRow.fromUserId,
                        settlementRow.toUserId,
                        settlementRow.amount,
                      )
                    }
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    {rowIsMarkedSettled
                      ? settlementTranslations("markSettledDone")
                      : settlementTranslations("markSettled")}
                  </Button>
                </div>
              ) : null}
              {viewerIsCreditor ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-[44px] gap-1.5 text-xs print:hidden sm:min-h-0 sm:h-7"
                  onClick={() =>
                    void copySettlementRequestText(
                      settlementRow.amount,
                      requestPaymentUrl,
                    )
                  }
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                  {settlementTranslations("copyRequest")}
                </Button>
              ) : null}
            </div>
          </li>
        );
      })}
      {copyToastMessage ? (
        <li className="pointer-events-none fixed right-4 bottom-6 z-50 rounded-md border border-[var(--apple-separator)] bg-[var(--apple-card-bg)] px-3 py-2 text-xs shadow-lg">
          {copyToastMessage}
        </li>
      ) : null}
    </ul>
  );
}
