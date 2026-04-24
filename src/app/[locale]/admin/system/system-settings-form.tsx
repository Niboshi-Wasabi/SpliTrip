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
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [maintenanceOn, setMaintenanceOn] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState("");
  const [promoHref, setPromoHref] = useState("");
  const [promoImage, setPromoImage] = useState("");
  const [labelJa, setLabelJa] = useState("");
  const [labelEn, setLabelEn] = useState("");

  const load = useCallback(async () => {
    setErr(null);
    const res = await fetch("/api/admin/system-settings", { cache: "no-store" });
    const j = (await res.json().catch(() => null)) as
      | { ok?: boolean; items?: Item[]; message?: string }
      | null;
    if (!res.ok || !j?.ok) {
      if (j?.message === "step_up_required" || res.status === 403) {
        setErr(t("stepUpRequiredError"));
        return;
      }
      setErr(t("systemSettingsLoadError"));
      return;
    }
    for (const it of j.items ?? []) {
      if (it.key === "maintenance_mode" && it.value && typeof it.value === "object") {
        setMaintenanceOn(
          (it.value as { enabled?: boolean }).enabled === true,
        );
      }
      if (it.key === "maintenance_announcement" && it.value && typeof it.value === "object") {
        setMaintenanceMsg(
          String((it.value as { message?: string }).message ?? ""),
        );
      }
      if (it.key === "promo_banner_config" && it.value && typeof it.value === "object") {
        const v = it.value as { href?: string; imageUrl?: string; labelJa?: string; labelEn?: string };
        setPromoHref(String(v.href ?? ""));
        setPromoImage(String(v.imageUrl ?? ""));
        setLabelJa(String(v.labelJa ?? ""));
        setLabelEn(String(v.labelEn ?? ""));
      }
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setBusy(true);
    setOk(false);
    setErr(null);
    try {
      const res = await fetch("/api/admin/system-settings", {
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
      if (!res.ok) {
        setErr(t("systemSettingsSaveError"));
        return;
      }
      setOk(true);
      router.refresh();
    } catch {
      setErr(t("systemSettingsSaveError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {err ? (
        <p className="text-sm text-destructive" role="alert">
          {err}
        </p>
      ) : null}
      {ok ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
          {t("systemSettingsSaved")}
        </p>
      ) : null}

      <div className="space-y-3 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">{t("systemMaintenanceBlock")}</h2>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="mOn"
            className="h-4 w-4"
            checked={maintenanceOn}
            onChange={(e) => setMaintenanceOn(e.target.checked)}
          />
          <Label htmlFor="mOn">{t("systemMaintenanceToggle")}</Label>
        </div>
        <p className="text-xs text-muted-foreground">{t("systemMaintenanceHint")}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mMsg">{t("systemMaintenanceBannerText")}</Label>
        <textarea
          id="mMsg"
          rows={2}
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          value={maintenanceMsg}
          onChange={(e) => setMaintenanceMsg(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          {t("systemMaintenanceBannerHint")}
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">{t("systemPromoBlock")}</h2>
        <div>
          <Label htmlFor="href">URL (href)</Label>
          <Input
            id="href"
            value={promoHref}
            onChange={(e) => setPromoHref(e.target.value)}
            placeholder="https://"
          />
        </div>
        <div>
          <Label htmlFor="img">{t("systemPromoImageUrl")}</Label>
          <Input
            id="img"
            value={promoImage}
            onChange={(e) => setPromoImage(e.target.value)}
            placeholder="https://"
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label htmlFor="lja">label (JA)</Label>
            <Input
              id="lja"
              value={labelJa}
              onChange={(e) => setLabelJa(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="len">label (EN)</Label>
            <Input
              id="len"
              value={labelEn}
              onChange={(e) => setLabelEn(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Button type="button" onClick={() => void save()} disabled={busy}>
        {busy ? t("saving") : t("systemSettingsSaveButton")}
      </Button>
    </div>
  );
}
