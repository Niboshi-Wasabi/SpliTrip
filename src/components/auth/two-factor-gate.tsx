"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { Settings } from "lucide-react";

type StatusPayload = {
  ok: boolean;
  enabled: boolean;
  credentialCount: number;
  remainingBackupCodes: number;
  verified: boolean;
};

type RegisterVerifyPayload = {
  ok: boolean;
  backupCodes?: string[];
  message?: string;
};

type Props = {
  nextPath: string;
};

export function TwoFactorGate({ nextPath }: Props) {
  const t = useTranslations("TwoFactor");
  const router = useRouter();
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [noPasskeyError, setNoPasskeyError] = useState<boolean>(false);
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);

  const needsSetup = useMemo(
    () => status !== null && status.credentialCount === 0,
    [status],
  );

  const loadStatus = useCallback(async () => {
    const response = await fetch("/api/auth/2fa/status", {
      cache: "no-store",
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error("status fetch failed");
    }
    const payload = (await response.json()) as StatusPayload;
    setStatus(payload);
    
    // 既に認証済みなら即座にリダイレクト
    if (payload.verified) {
      window.location.href = nextPath;
    }
    
    return payload;
  }, [nextPath, router]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  // ステータス変更時の自動遷移を分離（初回ロード時の確実な遷移のため）
  useEffect(() => {
    if (status?.verified) {
      // 即座に強制遷移
      const redirectTimer = setTimeout(() => {
        window.location.href = nextPath;
      }, 50);

      return () => clearTimeout(redirectTimer);
    }
    
    // 初回アクセス時（パスキー未登録）は自動的に設定画面へリダイレクト
    if (status !== null && status.credentialCount === 0 && !status.verified) {
      const setupRedirectTimer = setTimeout(() => {
        // クエリパラメータで元の遷移先を保持
        const setupUrl = new URL('/settings', window.location.origin);
        setupUrl.searchParams.set('setup', '2fa');
        setupUrl.searchParams.set('returnTo', nextPath);
        window.location.href = setupUrl.toString();
      }, 1000); // 1秒待ってからリダイレクト（ユーザーが状況を把握できるよう）

      return () => clearTimeout(setupRedirectTimer);
    }
  }, [status?.verified, status?.credentialCount, nextPath, router]);

  async function handleRegister() {
    setBusy(true);
    setError(null);
    setNewBackupCodes(null);
    try {
      const optionsResponse = await fetch("/api/auth/2fa/webauthn/register/options", {
        method: "POST",
        credentials: "include",
      });
      if (!optionsResponse.ok) {
        throw new Error("register options failed");
      }
      const optionsPayload = (await optionsResponse.json()) as {
        ok: boolean;
        options: PublicKeyCredentialCreationOptions;
      };
      const registrationResult = await startRegistration({
        optionsJSON: optionsPayload.options as never,
      });

      const verifyResponse = await fetch("/api/auth/2fa/webauthn/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: registrationResult }),
        credentials: "include",
      });
      const verifyPayload = (await verifyResponse.json()) as RegisterVerifyPayload;
      if (!verifyResponse.ok || !verifyPayload.ok) {
        throw new Error(verifyPayload.message ?? "register verify failed");
      }
      setNewBackupCodes(verifyPayload.backupCodes ?? []);
      // 登録成功後は確実に認証済み状態になるため、状態を直接更新
      // 遷移はuseEffectで自動的に行われる
      setStatus((currentStatus) => 
        currentStatus ? { ...currentStatus, verified: true } : null
      );

      // 即座に強制遷移（ダブルセーフティ）
      setTimeout(() => {
        // 強制的にページ遷移
        window.location.href = nextPath;
      }, 100);
    } catch {
      setError(t("registerFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleAuthenticate() {
    setBusy(true);
    setError(null);
    setNoPasskeyError(false);
    try {
      const optionsResponse = await fetch(
        "/api/auth/2fa/webauthn/authenticate/options",
        {
          method: "POST",
          credentials: "include",
        },
      );
      if (!optionsResponse.ok) {
        // サーバーからのエラーレスポンスを解析
        try {
          const errorPayload = await optionsResponse.json() as { code?: string; message?: string };
          if (errorPayload.code === "NO_PASSKEY") {
            setError("使用可能なパスキーがありません。");
            setNoPasskeyError(true);
            return;
          }
        } catch {
          // JSON解析失敗時は一般エラー
        }
        throw new Error("auth options failed");
      }
      const optionsPayload = (await optionsResponse.json()) as {
        ok: boolean;
        options: PublicKeyCredentialRequestOptions;
      };

      const authenticationResult = await startAuthentication({
        optionsJSON: optionsPayload.options as never,
      });

      const verifyResponse = await fetch(
        "/api/auth/2fa/webauthn/authenticate/verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ response: authenticationResult }),
          credentials: "include",
        },
      );
      if (!verifyResponse.ok) {
        throw new Error("auth verify failed");
      }

      // 認証成功後は確実に認証済み状態になるため、状態を直接更新
      // 遷移はuseEffectで自動的に行われる
      setStatus((currentStatus) => 
        currentStatus ? { ...currentStatus, verified: true } : null
      );

      // 即座に強制遷移（ダブルセーフティ）
      setTimeout(() => {
        // 強制的にページ遷移
        window.location.href = nextPath;
      }, 100);
    } catch {
      setError(t("authFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleBackupVerify() {
    if (!backupCode.trim()) {
      setError(t("backupCodeRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    setNoPasskeyError(false);
    try {
      const response = await fetch("/api/auth/2fa/backup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: backupCode.trim() }),
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("backup verify failed");
      }
      // バックアップコード認証成功後は確実に認証済み状態になるため、状態を直接更新
      // 遷移はuseEffectで自動的に行われる
      setStatus((currentStatus) => 
        currentStatus ? { ...currentStatus, verified: true } : null
      );

      // 即座に強制遷移（ダブルセーフティ）
      setTimeout(() => {
        // 強制的にページ遷移
        window.location.href = nextPath;
      }, 100);
    } catch {
      setError(t("backupCodeInvalid"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {needsSetup && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/35 dark:text-blue-100">
          <p className="font-medium mb-1">初回アクセスのセキュリティ設定</p>
          <p className="text-xs">アカウントのセキュリティを向上させるため、まず2段階認証の設定を行います。設定画面に移動しています...</p>
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        {needsSetup ? t("setupDescription") : t("verifyDescription")}
      </p>

      {newBackupCodes && newBackupCodes.length > 0 ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-semibold">{t("backupCodesTitle")}</p>
          <p className="mb-2">{t("backupCodesHint")}</p>
          <ul className="grid grid-cols-2 gap-1 font-mono">
            {newBackupCodes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {needsSetup ? (
        <Button type="button" className="w-full min-h-[44px]" disabled={busy} onClick={() => void handleRegister()}>
          {busy ? t("processing") : t("registerButton")}
        </Button>
      ) : (
        <Button type="button" className="w-full min-h-[44px]" disabled={busy} onClick={() => void handleAuthenticate()}>
          {busy ? t("processing") : t("authenticateButton")}
        </Button>
      )}

      <div className="space-y-2 rounded-md border border-border p-3">
        <p className="text-sm font-medium">{t("backupCodeSectionTitle")}</p>
        <Input
          value={backupCode}
          onChange={(event) => setBackupCode(event.target.value)}
          placeholder={t("backupCodePlaceholder")}
          autoComplete="one-time-code"
        />
        <Button
          type="button"
          variant="outline"
          className="w-full min-h-[44px]"
          disabled={busy}
          onClick={() => void handleBackupVerify()}
        >
          {t("backupCodeVerifyButton")}
        </Button>
      </div>

      {error ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{error}</p>
          {noPasskeyError && (
            <div className="flex items-center gap-2">
              <Link
                href="/settings"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground underline"
              >
                <Settings className="h-3 w-3" />
                設定画面で生体認証を登録
              </Link>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
