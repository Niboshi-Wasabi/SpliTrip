import type { AppLocale } from "@/i18n/routing";
import { createClient } from "@/utils/supabase/server";
import { WhatsNewModal, type WhatsNewAnnouncement } from "@/components/ui/WhatsNewModal";

type WhatsNewModalGateProps = {
  locale: AppLocale;
};

/**
 * 最新の公開お知らせと既読状態を照合し、未読時のみモーダルを表示する。
 */
export async function WhatsNewModalGate({ locale }: WhatsNewModalGateProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: latestAnnouncement, error: latestAnnouncementError } = await supabase
    .from("app_announcements")
    .select("id, title_ja, title_en, content_ja, content_en, icon_type")
    .eq("is_published", true)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestAnnouncementError) {
    console.error("[WhatsNewModalGate] latest announcement query failed:", latestAnnouncementError);
    return null;
  }

  if (!latestAnnouncement) {
    return null;
  }

  const { data: userProfile, error: userProfileError } = await supabase
    .from("user_profiles")
    .select("last_seen_announcement_id")
    .eq("id", user.id)
    .maybeSingle();

  if (userProfileError) {
    console.error("[WhatsNewModalGate] profile query failed:", userProfileError);
    return null;
  }

  const localizedTitle = locale === "en" ? latestAnnouncement.title_en : latestAnnouncement.title_ja;
  const localizedBody = locale === "en" ? latestAnnouncement.content_en : latestAnnouncement.content_ja;

  const announcement: WhatsNewAnnouncement = {
    id: latestAnnouncement.id,
    title: localizedTitle ?? "",
    content: localizedBody ?? "",
    iconType:
      latestAnnouncement.icon_type === null
        ? null
        : (latestAnnouncement.icon_type as WhatsNewAnnouncement["iconType"]),
  };

  const shouldOpen = userProfile?.last_seen_announcement_id !== latestAnnouncement.id;

  if (!shouldOpen) {
    return null;
  }

  return <WhatsNewModal announcement={announcement} defaultOpen={true} />;
}
