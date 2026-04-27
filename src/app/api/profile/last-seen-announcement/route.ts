import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const INTERNAL_SERVER_ERROR_MESSAGE = "サーバーで予期せぬエラーが発生しました。";

type LastSeenAnnouncementRequestBody = {
  announcementId?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let requestBody: LastSeenAnnouncementRequestBody;
  try {
    requestBody = (await request.json()) as LastSeenAnnouncementRequestBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const announcementId = requestBody.announcementId?.trim();
  if (!announcementId) {
    return NextResponse.json({ error: "announcement_id_required" }, { status: 400 });
  }

  const { data: targetAnnouncement, error: announcementQueryError } = await supabase
    .from("app_announcements")
    .select("id")
    .eq("id", announcementId)
    .eq("is_published", true)
    .maybeSingle();

  if (announcementQueryError) {
    console.error("[API/Action Error - POST /api/profile/last-seen-announcement]:", announcementQueryError);
    return NextResponse.json(
      { error: "announcement_query_failed", message: INTERNAL_SERVER_ERROR_MESSAGE },
      { status: 500 },
    );
  }

  if (!targetAnnouncement) {
    return NextResponse.json({ error: "announcement_not_found" }, { status: 404 });
  }

  const { data: updatedProfileRows, error: updateError } = await supabase
    .from("user_profiles")
    .update({ last_seen_announcement_id: announcementId })
    .eq("id", user.id)
    .select("id");

  if (updateError) {
    console.error("[API/Action Error - POST /api/profile/last-seen-announcement]:", updateError);
    return NextResponse.json(
      { error: "update_failed", message: INTERNAL_SERVER_ERROR_MESSAGE },
      { status: 500 },
    );
  }

  if (!updatedProfileRows || updatedProfileRows.length === 0) {
    const { error: upsertError } = await supabase
      .from("user_profiles")
      .upsert(
        {
          id: user.id,
          last_seen_announcement_id: announcementId,
        },
        { onConflict: "id" },
      );

    if (upsertError) {
      console.error("[API/Action Error - POST /api/profile/last-seen-announcement]:", upsertError);
      return NextResponse.json(
        { error: "upsert_failed", message: INTERNAL_SERVER_ERROR_MESSAGE },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true });
}
