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

  return (
    <>
      <LandingPage
        initialSession={
          user
            ? {
                isAuthenticated: true,
                displayName: extractDisplayName(user),
                avatarUrl: extractAvatarUrl(user),
              }
            : {
                isAuthenticated: false,
                displayName: null,
                avatarUrl: null,
              }
        }
      />
      <GoogleOneTap skipPrompt={user !== null} />
    </>
  );
}
