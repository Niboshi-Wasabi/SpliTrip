"use server";

/**
 * Persists UI language on `user_profiles` so middleware can align the NEXT_LOCALE cookie.
 * ミドルウェアが NEXT_LOCALE と揃えられるよう `user_profiles` に UI 言語を保存する。
 */
import { revalidatePath } from "next/cache";
import { withLocalePrefix } from "@/lib/i18n/localized-paths";
import { routing } from "@/i18n/routing";
import {
  extractAvatarUrl,
  extractDisplayName,
} from "@/lib/user-profile";
import { createClient } from "@/utils/supabase/server";

export type UpdatePreferredLanguageResult =
  | { ok: true }
  | { ok: false; errorCode: string };

/**
 * @param language - `ja` or `en` / `ja` または `en`
 */
export async function updatePreferredLanguageAction(
  language: string,
): Promise<UpdatePreferredLanguageResult> {
  if (language !== "ja" && language !== "en") {
    return { ok: false, errorCode: "invalid_language" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, errorCode: "unauthorized" };
  }

  const { data: updatedRow, error: updateError } = await supabase
    .from("user_profiles")
    .update({ preferred_language: language })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("updatePreferredLanguageAction:", updateError.message);
    return { ok: false, errorCode: "update_failed" };
  }

  if (!updatedRow) {
    const { error: insertError } = await supabase.from("user_profiles").insert({
      id: user.id,
      preferred_language: language,
      display_name: extractDisplayName(user),
      avatar_url: extractAvatarUrl(user),
    });

    if (insertError) {
      console.error("updatePreferredLanguageAction insert:", insertError.message);
      return { ok: false, errorCode: "insert_failed" };
    }
  }

  for (const loc of routing.locales) {
    revalidatePath(withLocalePrefix(loc, "/settings"));
  }

  return { ok: true };
}
