import { NextResponse } from "next/server";

/**
 * Placeholder for Web Push subscription storage & send pipeline (VAPID, service worker).
 * ブラウザ通知の購読・送信基盤のプレースホルダー（本番では VAPID + worker と連携）。
 *
 * Why 501: route exists for future wiring without pretending delivery works yet.
 * 理由: 将来の配線用にエンドポイントだけ先に置き、未実装であることを明示する。
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "not_implemented",
      message:
        "Web Push は今後のリリースで有効化予定です。/ Web Push delivery is not enabled yet.",
    },
    { status: 501 },
  );
}
