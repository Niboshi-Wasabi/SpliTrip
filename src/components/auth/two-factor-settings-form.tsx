"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";

type StatusPayload = {
  ok: boolean;
  enabled: boolean;
  credentialCount: number;
  remainingBackupCodes: number;
  verified: boolean;
};

export function TwoFactorSettingsForm() {
  const t = useTranslations("TwoFactor");
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 2FAセットアップ後のリダイレクト処理
  const isSetupMode = searchParams.get('setup') === '2fa';
  const returnTo = searchParams.get('returnTo');

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

  // 2FAが正常に設定された場合のリダイレクト処理
  useEffect(() => {
    if (isSetupMode && status?.credentialCount && status.credentialCount > 0 && returnTo) {
      // 2FAが設定完了したら元のページにリダイレクト
      const redirectTimer = setTimeout(() => {
        window.location.href = returnTo;
      }, 2000); // 2秒待ってから遷移

      return () => clearTimeout(redirectTimer);
    }
  }, [isSetupMode, status?.credentialCount, returnTo]);

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
    return <p className="text-sm text-[var(--apple-text-secondary)]">{t("loading")}</p>;
  }

  return (
    <div className="space-y-3">
      {isSetupMode && status.credentialCount === 0 && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/35 dark:text-blue-100">
          <p className="font-medium mb-1">2段階認証の設定が必要です</p>
          <p className="text-xs">アカウントのセキュリティを向上させるため、生体認証（パスキー）の登録をお願いします。設定完了後、自動的に元のページに戻ります。</p>
        </div>
      )}
      {isSetupMode && status.credentialCount > 0 && returnTo && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900 dark:border-green-900/60 dark:bg-green-950/35 dark:text-green-100">
          <p className="font-medium mb-1">設定完了！</p>
          <p className="text-xs">2段階認証が正常に設定されました。2秒後に元のページに戻ります...</p>
        </div>
      )}
      <p className="text-sm text-[var(--apple-text-secondary)]">
        {status.enabled ? t("enabledState") : t("disabledState")}
      </p>
      <p className="text-xs text-[var(--apple-text-secondary)]">
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
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </div>
  );
}
