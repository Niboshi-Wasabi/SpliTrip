"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type StatusPayload = {
  ok: boolean;
  enabled: boolean;
  credentialCount: number;
  remainingBackupCodes: number;
  verified: boolean;
};

export function TwoFactorSettingsForm() {
  const t = useTranslations("TwoFactor");
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reloadStatus() {
    const response = await fetch("/api/auth/2fa/status", { 
      cache: "no-store",
      credentials: "include"
    });
    if (!response.ok) {
      throw new Error("status fetch failed");
    }
    const payload = (await response.json()) as StatusPayload;
    setStatus(payload);
  }

  useEffect(() => {
    void reloadStatus();
  }, []);

  async function handleRegenerateBackupCodes() {
    setBusy(true);
    setError(null);
    setBackupCodes(null);
    try {
      const response = await fetch("/api/auth/2fa/backup/regenerate", {
        method: "POST",
        credentials: "include",
      });
      const payload = (await response.json()) as {
        ok: boolean;
        backupCodes?: string[];
      };
      if (!response.ok || !payload.ok) {
        throw new Error("regenerate failed");
      }
      setBackupCodes(payload.backupCodes ?? []);
      await reloadStatus();
    } catch {
      setError(t("backupCodeRegenerateFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (!status) {
    return <p className="text-sm text-muted-foreground">{t("loading")}</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {status.enabled ? t("enabledState") : t("disabledState")}
      </p>
      <p className="text-xs text-muted-foreground">
        {t("statusSummary", {
          credentialCount: status.credentialCount,
          backupCount: status.remainingBackupCodes,
        })}
      </p>
      <Button
        type="button"
        variant="outline"
        className="min-h-[44px]"
        disabled={busy}
        onClick={() => void handleRegenerateBackupCodes()}
      >
        {busy ? t("processing") : t("backupCodeRegenerateButton")}
      </Button>
      {backupCodes && backupCodes.length > 0 ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-semibold">{t("backupCodesTitle")}</p>
          <ul className="mt-2 grid grid-cols-2 gap-1 font-mono">
            {backupCodes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
