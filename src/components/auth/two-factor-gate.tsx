"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);

  const needsSetup = useMemo(
    () => status !== null && status.credentialCount === 0 && !status.verified,
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
    console.log("[2FA] ステータス取得:", payload);
    console.log("[2FA] Build version:", process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "local");
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
      // 即座に強制遷移（より確実な方法）
      console.log("[2FA] useEffect - 認証済み検知、遷移先:", nextPath);
      window.location.replace(nextPath);
      return;
    }
    
    // 初回アクセス時（パスキー未登録）は自動的に設定画面へリダイレクト
    if (status !== null && status.credentialCount === 0 && !status.verified) {
      console.log("[2FA] 初回ユーザー検知、設定画面へ自動遷移");
      const setupRedirectTimer = setTimeout(() => {
        const setupUrl = new URL('/settings', window.location.origin);
        setupUrl.searchParams.set('setup', '2fa');
        setupUrl.searchParams.set('returnTo', nextPath);
        console.log("[2FA] 設定画面遷移:", setupUrl.toString());
        window.location.href = setupUrl.toString();
      }, 500); // 500ms待ってからリダイレクト（UIの表示確認のため短縮）

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
    console.log("[2FA] 認証ボタンクリック、現在のステータス:", status);
    setBusy(true);
    setError(null);
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
            // エラーメッセージを表示せず、直接設定画面に遷移
            console.log("[2FA] パスキー未登録、設定画面へ遷移");
            const setupUrl = new URL('/settings', window.location.origin);
            setupUrl.searchParams.set('setup', '2fa');
            setupUrl.searchParams.set('returnTo', nextPath);
            window.location.href = setupUrl.toString();
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

      console.log("[2FA] WebAuthn認証開始:", optionsPayload.options);
      console.log("[2FA] 利用可能な認証器:", optionsPayload.options.allowCredentials);
      console.log("[2FA] RP ID:", optionsPayload.options.rpId);
      console.log("[2FA] User Verification:", optionsPayload.options.userVerification);
      console.log("[2FA] ブラウザ情報:", {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        webAuthnSupport: !!navigator.credentials?.create,
        isSecureContext: window.isSecureContext,
        origin: window.location.origin
      });
      
      // ユーザーに認証が開始されることを明示
      setError("生体認証を実行してください...");
      
      const authenticationResult = await startAuthentication({
        optionsJSON: optionsPayload.options as never,
      });
      console.log("[2FA] WebAuthn認証結果:", authenticationResult);
      
      // 成功時はエラーメッセージをクリア
      setError(null);

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
      setStatus((currentStatus) => 
        currentStatus ? { ...currentStatus, verified: true } : null
      );

      // 即座に強制遷移（より確実な遷移処理）
      console.log("[2FA] 認証成功、遷移先:", nextPath);
      window.location.replace(nextPath);
    } catch (error) {
      console.error("[2FA] 認証エラー詳細:", error);
      
      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          setError("認証がキャンセルされたか、タイムアウトしました。再度お試しください。");
        } else if (error.name === "InvalidStateError") {
          // パスキーが削除されているか、無効な状態
          setError("登録されたパスキーが見つかりません。設定画面で再登録してください。");
        } else if (error.name === "NotSupportedError") {
          setError("お使いのブラウザまたはデバイスは生体認証に対応していません。バックアップコードをご利用ください。");
        } else if (error.message.includes("NO_PASSKEY")) {
          // パスキーがない場合の処理
          console.log("[2FA] パスキーなしエラー、設定画面へ遷移");
          const setupUrl = new URL('/settings', window.location.origin);
          setupUrl.searchParams.set('setup', '2fa');
          setupUrl.searchParams.set('returnTo', nextPath);
          window.location.href = setupUrl.toString();
          return;
        } else {
          setError(`認証に失敗しました。しばらく経ってからお試しください。`);
        }
      } else {
        setError(t("authFailed"));
      }
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
      setStatus((currentStatus) => 
        currentStatus ? { ...currentStatus, verified: true } : null
      );

      // 即座に強制遷移（より確実な遷移処理）
      console.log("[2FA] バックアップコード認証成功、遷移先:", nextPath);
      window.location.replace(nextPath);
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
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            設定画面に移動中...
          </div>
        </div>
      ) : (
        <Button type="button" className="w-full min-h-[44px]" disabled={busy} onClick={() => void handleAuthenticate()}>
          {busy ? t("processing") : error ? "再度認証する" : t("authenticateButton")}
        </Button>
      )}

      {!needsSetup && (
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
      )}

      {error && !needsSetup ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/35 dark:text-red-300">
          <p className="font-medium mb-2">認証エラー</p>
          <p>{error}</p>
          {error.includes("キャンセル") || error.includes("タイムアウト") || error.includes("生体認証を実行") ? (
            <div className="mt-3 text-xs">
              <p>💡 <strong>対処法:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>認証ポップアップが表示される場合</strong>: 指紋センサーに触れるか、Face IDを実行してください</li>
                <li><strong>ポップアップが表示されない場合</strong>: ブラウザがWebAuthnをブロックしている可能性があります</li>
                <li><strong>認証が常に失敗する場合</strong>: 下のバックアップコードを使用することをお勧めします</li>
                <li><strong>Windows Hello/Touch ID</strong>: システム設定で生体認証が有効になっているか確認してください</li>
                <li><strong>その他</strong>: Chrome/Edge/Safari等の主要ブラウザでお試しください</li>
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
