"use client";

/**
 * Unauthenticated invite flow: optional Turnstile, anonymous sign-in, then the same
 * `join_group_by_invite` RPC used on the server path.
 * 未ログイン向け招待: Turnstile（任意）→ 匿名サインイン → サーバー経路と同じ `join_group_by_invite` RPC。
 *
 * Why mirror the server RPC on the client: after anonymous auth, `auth.uid()` is set so the RPC can run under RLS-safe definer rules.
 * クライアントでも同じ RPC を呼ぶ理由: 匿名認証後に `auth.uid()` が立ち、definer RPC を RLS 整合のまま実行できるため。
 */

import { useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Loader2 } from "lucide-react";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { LoginTurnstile } from "@/components/auth/login-turnstile";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";
import { isSupabaseConfigured } from "@/utils/supabase/env";
import { isTurnstileConfigured } from "@/utils/turnstile-env";

const CAPTCHA_INCOMPLETE_MESSAGE = "確認を完了してください";
const SUPABASE_NOT_CONFIGURED_MESSAGE =
  "Supabase の接続情報が未設定です。.env.local を確認してください。";

type Props = {
  /** Invite token string (UUID) / 招待トークン（UUID 文字列） */
  token: string;
};

/**
 * Guest + captcha gate before joining via anonymous session.
 * 匿名セッションで参加する前のゲスト・CAPTCHA ゲート。
 *
 * @param props - Invite context / 招待コンテキスト
 */
export function JoinGate({ token }: Props) {
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRequired = isTurnstileConfigured();
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaOk = !captchaRequired || !!captchaToken;

  // Step 1: validate env + captcha. Step 2: anonymous sign-in. Step 3: RPC join.
  // 手順1: 環境と CAPTCHA を検証。手順2: 匿名サインイン。手順3: RPC で参加。
  async function handleJoinAsGuest() {
    if (!isSupabaseConfigured()) {
      setError(SUPABASE_NOT_CONFIGURED_MESSAGE);
      return;
    }
    if (captchaRequired && !captchaToken) {
      setError(CAPTCHA_INCOMPLETE_MESSAGE);
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInAnonymously({
      options: captchaToken ? { captchaToken } : undefined,
    });

    if (authError) {
      setError(
        authError.message ||
          "ゲストで参加できませんでした。匿名サインインが有効か確認してください。",
      );
      setLoading(false);
      turnstileRef.current?.reset();
      return;
    }

    const { data: groupId, error: rpcError } = await supabase.rpc(
      "join_group_by_invite",
      { p_token: token },
    );

    if (rpcError) {
      console.error("join_group_by_invite:", rpcError.message);
      setError("グループへの参加に失敗しました。");
      setLoading(false);
      return;
    }

    if (!groupId) {
      setError("無効な招待リンクか、グループが見つかりません。");
      setLoading(false);
      return;
    }

    window.location.assign(`/groups/${groupId}`);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>グループに参加</CardTitle>
          <CardDescription>
            招待リンクから参加します。ゲストでも参加できます（端末内のセッションで識別されます）。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {captchaRequired ? (
            <LoginTurnstile ref={turnstileRef} onTokenChange={setCaptchaToken} />
          ) : null}
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            className="w-full gap-2"
            disabled={loading || !captchaOk}
            onClick={() => void handleJoinAsGuest()}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 shrink-0 animate-spin" />
                参加処理中…
              </>
            ) : (
              "ゲストで参加する"
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Google / LINE でログインする場合は、
            <Link href="/" className="text-primary underline-offset-4 hover:underline">
              ログイン
            </Link>
            後にこのページを再読み込みしてください。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
