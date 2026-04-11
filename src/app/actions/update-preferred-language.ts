"use server";

/**
 * Persists UI language on `user_profiles` so middleware can align the NEXT_LOCALE cookie.
 * ミドルウェアが NEXT_LOCALE と揃えられるよう `user_profiles` に UI 言語を保存する。
 */
import { revalidatePath } from "next/cache";
import { withLocalePrefix } from "@/lib/i18n/localized-paths";
import { routing } from "@/i18n/routing";
import { isAppLocale } from "@/lib/i18n/next-intl-locale";
import { createClient } from "@/utils/supabase/server";

export type UpdatePreferredLanguageResult =
  | { ok: true }
  | { ok: false; errorCode: string };

/**
 * @param language - any AppLocale / サポート済みロケール
 */
export async function updatePreferredLanguageAction(
  language: string,
): Promise<UpdatePreferredLanguageResult> {
  if (!isAppLocale(language)) {
    return { ok: false, errorCode: "invalid_language" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, errorCode: "unauthorized" };
  }

  const { error: rpcError } = await supabase.rpc("update_own_preferred_language", {
    p_language: language,
  });

  if (rpcError) {
    console.error(
      "[API/Action Error - updatePreferredLanguageAction RPC]:",
      rpcError,
    );
    return { ok: false, errorCode: "update_failed" };
  }

  for (const locale of routing.locales) {
    revalidatePath(withLocalePrefix(locale, "/settings"));
  }

  return { ok: true };
}
