import { AuthAppShell } from "@/components/app/auth-app-shell";
import { createClient } from "@/utils/supabase/server";
import { extractDisplayName, extractAvatarUrl } from "@/lib/user-profile";

type SettingsLayoutProps = {
  children: React.ReactNode;
};

export default async function SettingsLayout({
  children,
}: SettingsLayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profileResponse = user
    ? await supabase.rpc("get_own_profile")
    : null;
  const profileData =
    profileResponse?.data &&
    typeof profileResponse.data === "object"
      ? (profileResponse.data as Record<string, unknown>)
      : null;

  const roleResponse = user
    ? await supabase
        .from("user_profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle()
    : null;

  const displayName =
    (typeof profileData?.display_name === "string"
      ? profileData.display_name
      : null) ??
    (user ? extractDisplayName(user) : "");
  const avatarUrl =
    (typeof profileData?.avatar_url === "string"
      ? profileData.avatar_url
      : null) ??
    (user ? extractAvatarUrl(user) : null);
  const isAdmin = roleResponse?.data?.is_admin === true;

  return (
    <AuthAppShell
      displayName={displayName}
      avatarUrl={avatarUrl}
      isAdmin={isAdmin}
    >
      {children}
    </AuthAppShell>
  );
}
