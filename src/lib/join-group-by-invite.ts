import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isInviteTokenFormat } from "@/lib/invite-token";

export type JoinInviteError =
  | "not_authenticated"
  | "invalid_token"
  | "invite_not_found"
  | "rpc_failed";

export type JoinInviteResult =
  | { ok: true; groupId: string }
  | { ok: false; error: JoinInviteError };

/**
 * 招待トークンでグループに参加（`join_group_by_invite` RPC）。
 */
export async function joinGroupByInviteForUser(
  sessionSupabase: SupabaseClient,
  user: User,
  inviteToken: string,
): Promise<JoinInviteResult> {
  const token = inviteToken.trim();
  if (!user.id) {
    return { ok: false, error: "not_authenticated" };
  }
  if (!isInviteTokenFormat(token)) {
    return { ok: false, error: "invalid_token" };
  }

  const { data: groupId, error } = await sessionSupabase.rpc(
    "join_group_by_invite",
    { p_token: token },
  );

  if (error) {
    console.error("[joinGroupByInviteForUser] join_group_by_invite:", error);
    return { ok: false, error: "rpc_failed" };
  }

  if (!groupId) {
    return { ok: false, error: "invite_not_found" };
  }

  return { ok: true, groupId: groupId as string };
}
