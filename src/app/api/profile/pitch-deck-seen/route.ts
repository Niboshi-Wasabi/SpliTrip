import { NextResponse } from "next/server";
import { isSupabaseAnonymousSession } from "@/lib/auth/is-supabase-anonymous-session";
import { createClient } from "@/utils/supabase/server";

const INTERNAL_SERVER_ERROR_MESSAGE =
  "サーバーで予期せぬエラーが発生しました。";

/**
 * Marks the pitch deck as completed for the signed-in user (`mark_pitch_deck_seen` RPC).
 * ログイン中ユーザーについてピッチ閲覧済みを記録する。
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (await isSupabaseAnonymousSession(supabase)) {
    return NextResponse.json({ error: "guest_read_only" }, { status: 403 });
  }

  const { error } = await supabase.rpc("mark_pitch_deck_seen");

  if (error) {
    const detail = `${error.message ?? ""} ${"details" in error && typeof error.details === "string" ? error.details : ""}`;
    if (detail.includes("anonymous_mutation_forbidden")) {
      return NextResponse.json({ error: "guest_read_only" }, { status: 403 });
    }
    console.error("[API/Action Error - POST /api/profile/pitch-deck-seen]:", error);
    return NextResponse.json(
      { error: "rpc_failed", message: INTERNAL_SERVER_ERROR_MESSAGE },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
