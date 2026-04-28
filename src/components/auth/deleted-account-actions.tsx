"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";

export function DeletedAccountActions() {
  const router = useRouter();
  const t = useTranslations("DeletedAccount");
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) {
      return;
    }
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={() => void handleSignOut()}
      disabled={isSigningOut}
      className="min-h-[44px] w-full sm:w-auto"
    >
      {isSigningOut ? t("signingOut") : t("signOut")}
    </Button>
  );
}
