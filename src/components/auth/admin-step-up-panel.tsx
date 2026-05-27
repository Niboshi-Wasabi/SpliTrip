"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Loader2, AlertCircle, Settings } from "lucide-react";
import { LogoMark } from "@/components/logo-mark";
import { Link } from "@/i18n/navigation";

type AdminStepUpPanelProps = {
  /** next-intl 用: ロケール接頭辞なし（例: `/admin`, `/admin/system`） */
  nextPath?: string;
};

export function AdminStepUpPanel({ nextPath = "/admin" }: AdminStepUpPanelProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noPasskeyError, setNoPasskeyError] = useState<boolean>(false);
  const router = useRouter();
  const t = useTranslations("Admin");

  const handleAuthenticate = async () => {
    if (isAuthenticating) return;

    setIsAuthenticating(true);
    setError(null);
    setNoPasskeyError(false);

    try {
      // 1. 認証オプションを取得
      const optionsResponse = await fetch("/api/admin/auth/webauthn-options", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!optionsResponse.ok) {
        const optionsData = await optionsResponse.json().catch(() => ({})) as { code?: string; message?: string };
        
        if (optionsResponse.status === 403) {
          throw new Error("管理者権限がありません。");
        } else if (optionsData.code === "NO_PASSKEY") {
          // 管理画面でも設定画面へ自動リダイレクト
          const setupUrl = new URL('/settings', window.location.origin);
          setupUrl.searchParams.set('setup', '2fa');
          setupUrl.searchParams.set('returnTo', nextPath);
          window.location.href = setupUrl.toString();
          return;
        } else {
          throw new Error("認証オプションの取得に失敗しました。");
        }
      }

      const { options } = await optionsResponse.json();
      
      // 2. WebAuthn 認証を実行
      if (!window.navigator?.credentials?.get) {
        throw new Error("このブラウザは生体認証に対応していません。");
      }

      const credential = await navigator.credentials.get({
        publicKey: {
          ...options,
          challenge: new Uint8Array(
            atob(options.challenge.replace(/-/g, "+").replace(/_/g, "/"))
              .split("")
              .map((c: string) => c.charCodeAt(0))
          ),
          allowCredentials: options.allowCredentials?.map((cred: { id: string; type: string }) => ({
            ...cred,
            id: new Uint8Array(
              atob(cred.id.replace(/-/g, "+").replace(/_/g, "/"))
                .split("")
                .map((c: string) => c.charCodeAt(0))
            ),
          })),
        },
      }) as PublicKeyCredential | null;

      if (!credential) {
        throw new Error("認証がキャンセルされました。");
      }

      const response = credential.response as AuthenticatorAssertionResponse;

      // 3. 認証レスポンスを検証
      const verifyResponse = await fetch("/api/admin/auth/webauthn-verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          response: {
            id: credential.id,
            rawId: arrayBufferToBase64URL(credential.rawId),
            type: credential.type,
            clientExtensionResults: credential.getClientExtensionResults(),
            response: {
              authenticatorData: arrayBufferToBase64URL(response.authenticatorData),
              clientDataJSON: arrayBufferToBase64URL(response.clientDataJSON),
              signature: arrayBufferToBase64URL(response.signature),
              userHandle: response.userHandle ? arrayBufferToBase64URL(response.userHandle) : null,
            },
          },
        }),
      });

      if (!verifyResponse.ok) {
        const verifyData = await verifyResponse.json().catch(() => ({}));
        
        if (verifyResponse.status === 429) {
          throw new Error("試行回数が多すぎます。しばらく待ってから再度お試しください。");
        } else if (verifyData.message === "Challenge missing or expired") {
          throw new Error("認証セッションが期限切れです。ページを再読み込みしてやり直してください。");
        } else if (verifyData.message === "Authentication verification failed") {
          throw new Error("認証に失敗しました。もう一度お試しください。");
        } else {
          throw new Error("認証の検証に失敗しました。");
        }
      }

      // 4. 成功: Cookieの設定を待ってから確実にリダイレクト
      console.log("[AdminStepUp] 認証成功、遷移先:", nextPath);
      
      // レスポンスからSet-Cookieヘッダーを確認
      const setCookieHeader = verifyResponse.headers.get('set-cookie');
      console.log("[AdminStepUp] Set-Cookie:", setCookieHeader);
      
      // より確実な遷移のため、少し待ってからリダイレクト
      setTimeout(() => {
        console.log("[AdminStepUp] リダイレクト実行");
        window.location.replace(nextPath);
      }, 200);

    } catch (error) {
      console.error("[AdminStepUp] 認証エラー:", error);
      
      if (error instanceof Error) {
        // DOMException (ユーザーキャンセルなど)
        if (error.name === "NotAllowedError") {
          setError("認証がキャンセルされました。再度お試しください。");
        } else if (error.name === "InvalidStateError") {
          setError("認証器の状態が無効です。設定を確認してください。");
        } else if (error.name === "NotSupportedError") {
          setError("この認証器は対応していません。");
        } else {
          // セキュリティのため、具体的なエラーメッセージは表示しない
          setError("認証に失敗しました。再度お試しください。");
        }
      } else {
        setError("予期しないエラーが発生しました。");
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {/* ロゴ */}
      <div className="flex flex-col items-center gap-2 text-center">
        <LogoMark className="text-4xl text-[var(--apple-link)]" />
        <h1 className="text-lg font-semibold text-[var(--apple-text-secondary)]">SpliTrip Admin</h1>
      </div>

      {/* メイン認証カード */}
      <Card className="shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--apple-link)]/10">
            <Shield className="h-6 w-6 text-[var(--apple-link)]" />
          </div>
          <CardTitle className="text-xl">{t("stepUpTitle")}</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            {t("stepUpDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-center text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
              {noPasskeyError && (
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-1 text-xs underline hover:no-underline"
                >
                  <Settings className="h-3 w-3" />
                  設定画面で生体認証を登録
                </Link>
              )}
            </div>
          )}

          <Button
            onClick={handleAuthenticate}
            disabled={isAuthenticating}
            className="w-full"
            size="lg"
          >
            {isAuthenticating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("stepUpAuthenticating")}
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                {t("stepUpAuthButton")}
              </>
            )}
          </Button>

          <div className="text-center">
            <Badge variant="outline" className="text-xs">
              15分間有効
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2 text-center text-xs text-[var(--apple-text-secondary)]">
        <p>
          管理画面へのアクセスには、追加の生体認証が必要です。
        </p>
        <p>
          • 認証方法：指紋認証、Face ID、セキュリティキーなど
          <br />
          • 有効期限：認証後15分間
          <br />
          • 必要な設定：事前に2FA（生体認証）の登録が必要
        </p>
        <p className="text-amber-600 dark:text-amber-400">
          ⚠️ 生体認証が未設定の場合は、設定画面で先に登録してください
        </p>
      </div>
    </div>
  );
}

// ヘルパー関数：ArrayBuffer を base64url に変換
function arrayBufferToBase64URL(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let byteIndex = 0; byteIndex < bytes.byteLength; byteIndex++) {
    binary += String.fromCharCode(bytes[byteIndex]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}