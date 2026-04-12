import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { JoinGate } from "./join-gate";
import { isInviteTokenFormat } from "@/lib/invite-token";
import { joinGroupByInviteForUser } from "@/lib/join-group-by-invite";
import {
  upsertUserProfileFromAuth,
  checkNeedsOnboarding,
  getMandatoryPitchHref,
} from "@/lib/user-profile";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ locale: string; token: string }> };

/**
 * Invite landing: authenticated users join via RPC; unauthenticated users see `JoinGate` (OAuth only).
 * 招待ランディング: ログイン済みは RPC で参加し、未ログインは `JoinGate`（OAuth）を表示する。
 *
 * Logged-in users never get 404 here: bad/expired invites redirect to `/dashboard`.
 * ログイン済みは 404 にせず、無効・期限切れ招待は `/dashboard` へ送る。
 *
 * Join: `joinGroupByInviteForUser`（`join_group_by_invite` RPC）。
 */
export default async function JoinByInvitePage({ params }: PageProps) {
  const { locale, token } = await params;
  const trimmedToken = token.trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (!isInviteTokenFormat(trimmedToken)) {
      notFound();
    }
    return <JoinGate token={trimmedToken} />;
  }

  if (!isInviteTokenFormat(trimmedToken)) {
    redirect({ href: "/dashboard", locale });
  }

  const pitchHref = await getMandatoryPitchHref(
    supabase,
    `/join/${trimmedToken}`,
  );
  if (pitchHref) {
    redirect({ href: pitchHref, locale });
    return;
  }

  if (await checkNeedsOnboarding(supabase)) {
    redirect({
      href: `/onboarding?next=/join/${trimmedToken}`,
      locale,
    });
    return;
  }

  const joinResult = await joinGroupByInviteForUser(supabase, user, trimmedToken);

  if (!joinResult.ok) {
    console.error("[JoinPage] joinGroupByInviteForUser failed:", joinResult.error, {
      tokenLen: trimmedToken.length,
    });
    redirect({ href: "/dashboard", locale });
    throw new Error("unreachable");
  }

  const groupId = joinResult.groupId;

  await upsertUserProfileFromAuth(supabase, user);

  redirect({ href: `/dashboard/groups/${groupId}`, locale });
}
