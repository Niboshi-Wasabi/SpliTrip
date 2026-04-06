import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

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

  const { error } = await supabase.rpc("mark_pitch_deck_seen");

  if (error) {
    console.error("mark_pitch_deck_seen:", error.message);
    return NextResponse.json(
      { error: "rpc_failed", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
