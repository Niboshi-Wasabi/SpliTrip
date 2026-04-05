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

/**
 * Upsert `user_profiles` after OAuth (or similar) creates/updates `auth.users`.
 */
export async function upsertUserProfileFromAuth(
  supabase: SupabaseClient,
  user: User,
  overrides?: { displayName?: string; avatarUrl?: string | null },
): Promise<void> {
  const display_name =
    overrides?.displayName != null && overrides.displayName.length > 0
      ? overrides.displayName
      : extractDisplayName(user);
  const avatar_url =
    overrides?.avatarUrl !== undefined
      ? overrides.avatarUrl
      : extractAvatarUrl(user);

  const { error } = await supabase.from("user_profiles").upsert(
    {
      id: user.id,
      display_name,
      avatar_url,
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("user_profiles upsert failed:", error.message);
  }
}
