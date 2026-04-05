"use client";

/**
 * Renders simplified settlement rows with optional PayPal / Cash App actions
 * only for rows where the current user is the debtor (`fromUserId`).
 */

import type { GroupMemberRow } from "@/lib/group-queries";
import type { GroupSettlement } from "@/lib/group-ledger";
import { formatMoneyByCurrency } from "@/lib/currency-payment-amount";
import {
  buildCashAppPaymentUrl,
  buildPaypalMePaymentUrl,
  openPaymentInNewTab,
} from "@/lib/payment-links";
import { Button } from "@/components/ui/button";

type Props = {
  settlements: GroupSettlement[];
  currencyCode: string;
  currentUserId: string;
  members: GroupMemberRow[];
};

function findMemberByUserId(
  members: GroupMemberRow[],
  userId: string,
): GroupMemberRow | undefined {
  return members.find((memberRow) => memberRow.user_id === userId);
}

export function GroupSettlementList({
  settlements,
  currencyCode,
  currentUserId,
  members,
}: Props) {
  return (
    <ul className="space-y-2">
      {settlements.map((settlementRow, rowIndex) => {
        const viewerIsDebtor = settlementRow.fromUserId === currentUserId;
        const recipientMember = findMemberByUserId(
          members,
          settlementRow.toUserId,
        );
        const paypalUrl =
          viewerIsDebtor && recipientMember
            ? buildPaypalMePaymentUrl(
                recipientMember.paypal_me_id,
                currencyCode,
                settlementRow.amount,
              )
            : null;
        const cashAppUrl =
          viewerIsDebtor && recipientMember
            ? buildCashAppPaymentUrl(
                recipientMember.cash_app_cashtag,
                currencyCode,
                settlementRow.amount,
              )
            : null;
        const hasPaymentLink = Boolean(paypalUrl || cashAppUrl);

        return (
          <li
            key={`${settlementRow.fromUserId}-${settlementRow.toUserId}-${rowIndex}`}
            className="flex flex-col gap-2 rounded-lg border p-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
          >
            <span>
              <span className="font-medium">
                {settlementRow.fromDisplayName}
              </span>
              <span className="mx-2 text-muted-foreground">→</span>
              <span className="font-medium">
                {settlementRow.toDisplayName}
              </span>
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold tabular-nums">
                {formatMoneyByCurrency(currencyCode, settlementRow.amount)}
              </span>
              {viewerIsDebtor && hasPaymentLink ? (
                <div
                  className="flex flex-wrap gap-1.5 print:hidden"
                  data-splitrip-png-ignore="true"
                >
                  {paypalUrl ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => openPaymentInNewTab(paypalUrl)}
                    >
                      PayPal で払う
                    </Button>
                  ) : null}
                  {cashAppUrl ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => openPaymentInNewTab(cashAppUrl)}
                    >
                      Cash App で払う
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
