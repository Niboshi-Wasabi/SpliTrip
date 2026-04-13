"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { isSupabaseConfigured } from "@/utils/supabase/env";

export function LogoutButton() {
  const router = useRouter();
  const bottomNavTranslations = useTranslations("BottomNav");

  async function handleLogout() {
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.refresh();
    router.push("/");
  }

  return (
    <Button variant="ghost" size="sm" className="min-h-[44px] gap-2 md:min-h-0" onClick={handleLogout}>
      <LogOut className="h-4 w-4" />
      {bottomNavTranslations("logout")}
    </Button>
  );
}
