import { NextResponse } from "next/server";
import { fetchPublicSystemStatusRows } from "@/lib/system-status";

/** 匿名でよい公開ステータス一覧。LP や外部からの参照用。 */
export async function GET() {
  try {
    const items = await fetchPublicSystemStatusRows();
    const response = NextResponse.json({ ok: true, items });
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=60",
    );
    return response;
  } catch (caughtError) {
    console.error("[API/Action Error - GET /api/public/system-status]:", caughtError);
    return NextResponse.json({ ok: false, message: "server_error" }, { status: 500 });
  }
}
