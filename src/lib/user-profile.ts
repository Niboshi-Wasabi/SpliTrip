import type { SupabaseClient, User } from "@supabase/supabase-js";

/** Best-effort display string from OAuth metadata or email local-part. */
export function extractDisplayName(user: User): string {
  const meta = user.user_metadata ?? {};
  return (
    (meta.full_name as string | undefined) ??
    (meta.name as string | undefined) ??
    (meta.user_name as string | undefined) ??
    (meta.preferred_username as string | undefined) ??
    user.email?.split("@")[0] ??
    "ユーザー"
  );
}

export function extractAvatarUrl(user: User): string | null {
  const meta = user.user_metadata ?? {};
  const url =
    (meta.avatar_url as string | undefined) ??
    (meta.picture as string | undefined) ??
    null;
  return url ?? null;
}

const DEFAULT_DISPLAY_NAMES = new Set(["ユーザー", "User", ""]);

/**
 * Upsert `user_profiles` after OAuth (or similar) creates/updates `auth.users`.
 * If the user already has a custom display name, preserve it (don't overwrite).
 */
export async function upsertUserProfileFromAuth(
  supabase: SupabaseClient,
  user: User,
  overrides?: { displayName?: string; avatarUrl?: string | null },
): Promise<void> {
  const oauthName =
    overrides?.displayName != null && overrides.displayName.length > 0
      ? overrides.displayName
      : extractDisplayName(user);
  const avatar_url =
    overrides?.avatarUrl !== undefined
      ? overrides.avatarUrl
      : extractAvatarUrl(user);

  const { data: existing } = await supabase.rpc("get_own_display_name");

  const hasCustomName =
    typeof existing === "string" &&
    existing.trim().length > 0 &&
    !DEFAULT_DISPLAY_NAMES.has(existing.trim());

  const display_name = hasCustomName ? existing : oauthName;

  const { error } = await supabase.rpc("upsert_user_profile", {
    p_display_name: display_name,
    p_avatar_url: avatar_url,
  });

  if (error) {
    console.error("user_profiles upsert failed:", error.message);
  }
}
