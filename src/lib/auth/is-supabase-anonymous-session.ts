import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Supabase の access_token ペイロードから `is_anonymous` を読む。
 * `getUser()` が `user.is_anonymous` を返さない環境でも JWT と DB の判定を揃える。
 */
function readJwtIsAnonymous(accessToken: string | undefined): boolean {
  if (!accessToken || !accessToken.includes(".")) {
    return false;
  }
  const payloadSegment = accessToken.split(".")[1];
  if (!payloadSegment) {
    return false;
  }
  try {
    const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
    const json =
      typeof Buffer !== "undefined"
        ? Buffer.from(padded, "base64").toString("utf8")
        : atob(padded);
    const payload = JSON.parse(json) as { is_anonymous?: boolean };
    return payload.is_anonymous === true;
  } catch {
    return false;
  }
}

function isAnonymousUserObject(user: User | null | undefined): boolean {
  return user?.is_anonymous === true;
}

/**
 * 匿名サインイン（JWT `is_anonymous: true`）かどうか。
 * user オブジェクトにフラグが無い場合は session の user / access_token を参照する。
 */
export function isAnonymousFromAuthState(input: {
  user: User | null;
  session: { user: User; access_token: string } | null;
}): boolean {
  if (isAnonymousUserObject(input.user)) {
    return true;
  }
  if (isAnonymousUserObject(input.session?.user)) {
    return true;
  }
  if (readJwtIsAnonymous(input.session?.access_token)) {
    return true;
  }
  return false;
}

export async function isSupabaseAnonymousSession(
  supabase: SupabaseClient,
): Promise<boolean> {
  const [{ data: userData }, { data: sessionData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ]);
  return isAnonymousFromAuthState({
    user: userData.user,
    session: sessionData.session,
  });
}
