"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Item = { key: string; value: unknown; description: string | null };

export function SystemSettingsForm() {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [maintenanceOn, setMaintenanceOn] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState("");
  const [promoHref, setPromoHref] = useState("");
  const [promoImage, setPromoImage] = useState("");
  const [labelJa, setLabelJa] = useState("");
  const [labelEn, setLabelEn] = useState("");

  const load = useCallback(async () => {
    setErrorMessage(null);
    const response = await fetch("/api/admin/system-settings", { cache: "no-store" });
    const responseBody = (await response.json().catch(() => null)) as
      | { ok?: boolean; items?: Item[]; message?: string }
      | null;
    if (!response.ok || !responseBody?.ok) {
      if (responseBody?.message === "step_up_required" || response.status === 403) {
        setErrorMessage(t("stepUpRequiredError"));
        return;
      }
      setErrorMessage(t("systemSettingsLoadError"));
      return;
    }
    for (const settingsItem of responseBody.items ?? []) {
      if (
        settingsItem.key === "maintenance_mode" &&
        settingsItem.value &&
        typeof settingsItem.value === "object"
      ) {
        setMaintenanceOn(
          (settingsItem.value as { enabled?: boolean }).enabled === true,
        );
      }
      if (
        settingsItem.key === "maintenance_announcement" &&
        settingsItem.value &&
        typeof settingsItem.value === "object"
      ) {
        setMaintenanceMsg(
          String((settingsItem.value as { message?: string }).message ?? ""),
        );
      }
      if (
        settingsItem.key === "promo_banner_config" &&
        settingsItem.value &&
        typeof settingsItem.value === "object"
      ) {
        const promoBannerValue = settingsItem.value as {
          href?: string;
          imageUrl?: string;
          labelJa?: string;
          labelEn?: string;
        };
        setPromoHref(String(promoBannerValue.href ?? ""));
        setPromoImage(String(promoBannerValue.imageUrl ?? ""));
        setLabelJa(String(promoBannerValue.labelJa ?? ""));
        setLabelEn(String(promoBannerValue.labelEn ?? ""));
      }
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setBusy(true);
    setIsSaved(false);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/admin/system-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            { key: "maintenance_mode", value: { enabled: maintenanceOn } },
            { key: "maintenance_announcement", value: { message: maintenanceMsg } },
            {
              key: "promo_banner_config",
              value: {
                href: promoHref,
                imageUrl: promoImage,
                labelJa,
                labelEn,
              },
            },
          ],
        }),
      });
      if (!response.ok) {
        setErrorMessage(t("systemSettingsSaveError"));
        return;
      }
      setIsSaved(true);
      router.refresh();
    } catch {
      setErrorMessage(t("systemSettingsSaveError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {errorMessage ? (
        <p className="text-sm text-red-500" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {isSaved ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
          {t("systemSettingsSaved")}
        </p>
      ) : null}

      <div className="space-y-3 rounded-lg border border-[var(--apple-separator)] p-4">
        <h2 className="text-sm font-medium">{t("systemMaintenanceBlock")}</h2>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="mOn"
            className="h-4 w-4"
            checked={maintenanceOn}
            onChange={(event) => setMaintenanceOn(event.target.checked)}
          />
          <Label htmlFor="mOn">{t("systemMaintenanceToggle")}</Label>
        </div>
        <p className="text-xs text-[var(--apple-text-secondary)]">{t("systemMaintenanceHint")}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mMsg">{t("systemMaintenanceBannerText")}</Label>
        <textarea
          id="mMsg"
          rows={2}
          className="border-input w-full rounded-md border px-3 py-2 text-sm"
          value={maintenanceMsg}
          onChange={(event) => setMaintenanceMsg(event.target.value)}
        />
        <p className="text-xs text-[var(--apple-text-secondary)]">
          {t("systemMaintenanceBannerHint")}
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-[var(--apple-separator)] p-4">
        <h2 className="text-sm font-medium">{t("systemPromoBlock")}</h2>
        <div>
          <Label htmlFor="href">URL (href)</Label>
          <Input
            id="href"
            value={promoHref}
            onChange={(event) => setPromoHref(event.target.value)}
            placeholder="https://"
          />
        </div>
        <div>
          <Label htmlFor="img">{t("systemPromoImageUrl")}</Label>
          <Input
            id="img"
            value={promoImage}
            onChange={(event) => setPromoImage(event.target.value)}
            placeholder="https://"
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label htmlFor="lja">label (JA)</Label>
            <Input
              id="lja"
              value={labelJa}
              onChange={(event) => setLabelJa(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="len">label (EN)</Label>
            <Input
              id="len"
              value={labelEn}
              onChange={(event) => setLabelEn(event.target.value)}
            />
          </div>
        </div>
      </div>

      <Button type="button" onClick={() => void save()} disabled={busy} className="min-h-[44px]">
        {busy ? t("saving") : t("systemSettingsSaveButton")}
      </Button>
    </div>
  );
}
