"use client";

/**
 * Client form backing `PATCH /api/profile/payment-methods`.
 * クライアントから `PATCH /api/profile/payment-methods` を呼ぶフォーム。
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  initialPaypalMeId: string;
  initialCashAppCashtag: string;
  /** True when DB lacks payout columns (migration not applied). / 送金先カラム未適用のとき */
  paymentSaveDisabled?: boolean;
};

export function PaymentSettingsForm({
  initialPaypalMeId,
  initialCashAppCashtag,
  paymentSaveDisabled = false,
}: Props) {
  const translations = useTranslations("Settings");
  const [paypalMeId, setPaypalMeId] = useState(initialPaypalMeId);
  const [cashAppCashtag, setCashAppCashtag] = useState(initialCashAppCashtag);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const res = await fetch("/api/profile/payment-methods", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paypal_me_id: paypalMeId.trim() === "" ? null : paypalMeId.trim(),
        cash_app_cashtag:
          cashAppCashtag.trim() === "" ? null : cashAppCashtag.trim(),
      }),
    });

    const body: unknown = await res.json().catch(() => null);

    if (!res.ok) {
      const errorPayload = body as { error?: string };
      if (errorPayload.error === "invalid_paypal_me_id") {
        setError(translations("paymentPaypalInvalid"));
      } else if (errorPayload.error === "invalid_cash_app_cashtag") {
        setError(translations("paymentCashInvalid"));
      } else if (errorPayload.error === "schema_missing") {
        setError(translations("paymentSchemaSaveError"));
      } else {
        setError(translations("saveError"));
      }
      setSaving(false);
      return;
    }

    const saved = body as {
      paypal_me_id?: string | null;
      cash_app_cashtag?: string | null;
    };
    setPaypalMeId(saved.paypal_me_id ?? "");
    setCashAppCashtag(saved.cash_app_cashtag ?? "");
    setMessage(translations("saved"));
    setSaving(false);
  }

  return (
    <form
      onSubmit={(formEvent) => void onSubmit(formEvent)}
      className="space-y-6"
    >
      <div className="space-y-2">
        <Label htmlFor="paypal_me_id">PayPal.me ID</Label>
        <Input
          id="paypal_me_id"
          name="paypal_me_id"
          type="text"
          autoComplete="off"
          placeholder={translations("paymentPaypalPlaceholder")}
          value={paypalMeId}
          disabled={paymentSaveDisabled}
          onChange={(changeEvent) => setPaypalMeId(changeEvent.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          {translations("paymentPaypalHintLead")}{" "}
          <span className="whitespace-nowrap">
            https://www.paypal.com/paypalme/
            <strong>{translations("paymentPaypalHintId")}</strong>
            /{translations("paymentAmountPath")}
          </span>
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cash_app_cashtag">{translations("paymentCashLabel")}</Label>
        <Input
          id="cash_app_cashtag"
          name="cash_app_cashtag"
          type="text"
          autoComplete="off"
          placeholder={translations("paymentCashPlaceholder")}
          value={cashAppCashtag}
          disabled={paymentSaveDisabled}
          onChange={(changeEvent) =>
            setCashAppCashtag(changeEvent.target.value)
          }
        />
        <p className="text-xs text-muted-foreground">{translations("paymentCashHint")}</p>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
          {message}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={saving || paymentSaveDisabled}
        className="min-h-[44px] gap-2 md:min-h-0"
      >
        {saving ? (
          <>
            <Loader2 className="size-4 shrink-0 animate-spin" />
            {translations("saving")}
          </>
        ) : (
          translations("paymentSave")
        )}
      </Button>
    </form>
  );
}
