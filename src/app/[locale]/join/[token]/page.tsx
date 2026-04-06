import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { JoinGate } from "./join-gate";
import { isInviteTokenFormat } from "@/lib/invite-token";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ locale: string; token: string }> };

/**
 * Invite landing: authenticated users join via RPC; guests see `JoinGate`.
 * 招待ランディング: ログイン済みは RPC で参加し、未ログインは `JoinGate` を表示する。
 *
 * Logged-in users never get 404 here: bad/expired invites redirect to `/dashboard`.
 * ログイン済みは 404 にせず、無効・期限切れ招待は `/dashboard` へ送る。
 *
 * Why hybrid: same `join_group_by_invite` RPC for both paths keeps RLS and token rules in one place.
 * ハイブリッドの理由: 両経路で同一 RPC を使い、RLS とトークン検証を一箇所に集約する。
 */
export default async function JoinByInvitePage({ params }: PageProps) {
  const { locale, token } = await params;
  const trimmedToken = token.trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("[JoinPage] user =", user?.id ?? "null", "isAnon =", user?.is_anonymous, "token =", trimmedToken);

  if (!user) {
    if (!isInviteTokenFormat(trimmedToken)) {
      notFound();
    }
    return <JoinGate token={trimmedToken} />;
  }

  if (!isInviteTokenFormat(trimmedToken)) {
    redirect({ href: "/dashboard", locale });
  }

  const { data: groupId, error: joinError } = await supabase.rpc(
    "join_group_by_invite",
    {
      p_token: trimmedToken,
    },
  );

  console.log("[JoinPage] RPC result: groupId =", groupId, "error =", joinError?.message ?? "none");

  if (joinError) {
    if (joinError.message.includes("Could not find the function")) {
      console.error(
        "join_group_by_invite: RPC が Supabase にありません。SQL Editor で supabase/migrations/20260405160000_group_invite_token.sql を実行するか、Dashboard → Project Settings → API でスキーマをリロードしてください。",
        joinError.message,
      );
    } else {
      console.error("join_group_by_invite:", joinError.message);
    }
    redirect({ href: "/dashboard", locale });
  }

  if (!groupId) {
    console.error("[JoinPage] groupId is null after RPC — invalid token?", { token: trimmedToken });
    redirect({ href: "/dashboard", locale });
  }

  console.log("[JoinPage] redirecting to /dashboard/groups/" + groupId);
  redirect({ href: `/dashboard/groups/${groupId}`, locale });
}
