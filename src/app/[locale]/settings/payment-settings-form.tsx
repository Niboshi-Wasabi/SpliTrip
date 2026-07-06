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
  initialPayPayLink: string;
  initialLinePayLink: string;
  /** True when DB lacks payout columns (migration not applied). / 送金先カラム未適用のとき */
  paymentSaveDisabled?: boolean;
};

export function PaymentSettingsForm({
  initialPaypalMeId,
  initialCashAppCashtag,
  initialPayPayLink,
  initialLinePayLink,
  paymentSaveDisabled = false,
}: Props) {
  const translations = useTranslations("Settings");
  const [paypalMeId, setPaypalMeId] = useState(initialPaypalMeId);
  const [cashAppCashtag, setCashAppCashtag] = useState(initialCashAppCashtag);
  const [payPayLink, setPayPayLink] = useState(initialPayPayLink);
  const [linePayLink, setLinePayLink] = useState(initialLinePayLink);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function resolveErrorCode(body: unknown): string | undefined {
    if (!body || typeof body !== "object") {
      return undefined;
    }
    const payload = body as { error?: string; message?: string };
    return payload.error ?? payload.message;
  }

  async function onSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/profile/payment-methods", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paypal_me_id: paypalMeId.trim() === "" ? null : paypalMeId.trim(),
        cash_app_cashtag:
          cashAppCashtag.trim() === "" ? null : cashAppCashtag.trim(),
        paypay_link: payPayLink.trim() === "" ? null : payPayLink.trim(),
        line_pay_link: linePayLink.trim() === "" ? null : linePayLink.trim(),
      }),
    });

    const body: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const errorCode = resolveErrorCode(body);
      if (errorCode === "invalid_paypal_me_id") {
        setError(translations("paymentPaypalInvalid"));
      } else if (errorCode === "invalid_cash_app_cashtag") {
        setError(translations("paymentCashInvalid"));
      } else if (errorCode === "invalid_paypay_link") {
        setError(translations("paymentPayPayInvalid"));
      } else if (errorCode === "invalid_line_pay_link") {
        setError(translations("paymentLinePayInvalid"));
      } else if (errorCode === "schema_missing") {
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
      paypay_link?: string | null;
      line_pay_link?: string | null;
    };
    setPaypalMeId(saved.paypal_me_id ?? "");
    setCashAppCashtag(saved.cash_app_cashtag ?? "");
    setPayPayLink(saved.paypay_link ?? "");
    setLinePayLink(saved.line_pay_link ?? "");
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
        <p className="text-xs text-[var(--apple-text-secondary)]">
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
        <p className="text-xs text-[var(--apple-text-secondary)]">{translations("paymentCashHint")}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="paypay_link">{translations("paymentPayPayLabel")}</Label>
        <Input
          id="paypay_link"
          name="paypay_link"
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder={translations("paymentPayPayPlaceholder")}
          value={payPayLink}
          disabled={paymentSaveDisabled}
          onChange={(changeEvent) => setPayPayLink(changeEvent.target.value)}
        />
        <p className="text-xs text-[var(--apple-text-secondary)]">
          {translations("paymentPayPayHint")}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="line_pay_link">{translations("paymentLinePayLabel")}</Label>
        <Input
          id="line_pay_link"
          name="line_pay_link"
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder={translations("paymentLinePayPlaceholder")}
          value={linePayLink}
          disabled={paymentSaveDisabled}
          onChange={(changeEvent) => setLinePayLink(changeEvent.target.value)}
        />
        <p className="text-xs text-[var(--apple-text-secondary)]">
          {translations("paymentLinePayHint")}
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-500" role="alert">
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
