import { LandingPage } from "@/components/landing/LandingPage";
import { GoogleOneTap } from "@/components/auth/GoogleOneTap";
import {
  extractAvatarUrl,
  extractDisplayName,
} from "@/lib/user-profile";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ locale: string }> };

export default async function LandingTopPage({ params }: PageProps) {
  await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdmin =
    user === null
      ? false
      : ((
          await supabase
            .from("user_profiles")
            .select("is_admin")
            .eq("id", user.id)
            .maybeSingle()
        ).data?.is_admin === true);

  return (
    <>
      <LandingPage
        initialSession={
          user
            ? {
                isAuthenticated: true,
                displayName: extractDisplayName(user),
                avatarUrl: extractAvatarUrl(user),
                isAdmin,
              }
            : {
                isAuthenticated: false,
                displayName: null,
                avatarUrl: null,
                isAdmin: false,
              }
        }
      />
      <GoogleOneTap skipPrompt={user !== null} />
    </>
  );
}
