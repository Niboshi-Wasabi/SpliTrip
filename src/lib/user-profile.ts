import type { SupabaseClient, User } from "@supabase/supabase-js";
import { clampDisplayNameForProfileStorage } from "@/lib/validation/display-name";

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

export const DEFAULT_DISPLAY_NAMES = new Set(["ユーザー", "User", ""]);

/**
 * ユーザーがまだカスタム表示名を設定していない（オンボーディング未完了）かどうかを判定する。
 * RPC が失敗した場合は false を返し、ユーザーをブロックしない。
 */
export async function checkNeedsOnboarding(
  supabase: SupabaseClient,
): Promise<boolean> {
  const { data: existingName, error } =
    await supabase.rpc("get_own_display_name");
  if (error) {
    console.error(
      "checkNeedsOnboarding RPC error (non-fatal):",
      error.message,
    );
    return false;
  }
  if (typeof existingName !== "string") return true;
  return DEFAULT_DISPLAY_NAMES.has(existingName.trim());
}

/**
 * Whether the user must see the first-login pitch deck (DB `needs_pitch_deck` RPC).
 * RPC 失敗時はブロックしないため false（スキップ扱い）。
 */
export async function checkNeedsPitchDeck(
  supabase: SupabaseClient,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("needs_pitch_deck");
  if (error) {
    console.error(
      "checkNeedsPitchDeck RPC error (non-fatal):",
      error.message,
    );
    return false;
  }
  return data === true;
}

/**
 * If set, redirect the authenticated user to this path first (open-redirect safe `next` only).
 * 初回のみ `/pitch?next=…` を返し、オンボーディングが必要ならその前に誘導する。
 */
export async function getMandatoryPitchHref(
  supabase: SupabaseClient,
  destinationAfterPitchFlow: string,
): Promise<string | null> {
  const needsPitch = await checkNeedsPitchDeck(supabase);
  if (!needsPitch) {
    return null;
  }
  const needsOnboarding = await checkNeedsOnboarding(supabase);
  const afterPitch = needsOnboarding
    ? `/onboarding?next=${encodeURIComponent(destinationAfterPitchFlow)}`
    : destinationAfterPitchFlow;
  return `/pitch?next=${encodeURIComponent(afterPitch)}`;
}

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

  const display_name = clampDisplayNameForProfileStorage(
    hasCustomName ? existing : oauthName,
  );

  const { error } = await supabase.rpc("upsert_user_profile", {
    p_display_name: display_name,
    p_avatar_url: avatar_url,
  });

  if (error) {
    console.error(
      "[API/Action Error - upsertUserProfileFromAuth upsert_user_profile]:",
      error,
    );
  }
}
