"use client";

/**
 * グループチャンネルのブロードキャストを購読し、
 * 他のクライアントからの変更通知を受信したら Server Component を再描画する。
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type Props = {
  groupId: string;
};

const DEBOUNCE_MS = 300;

export function RealtimeGroupRefresh({ groupId }: Props) {
  const router = useRouter();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    function handleBroadcast() {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        router.refresh();
      }, DEBOUNCE_MS);
    }

    const channel = supabase
      .channel(`realtime-group:${groupId}`)
      .on("broadcast", { event: "data-changed" }, handleBroadcast)
      .subscribe();

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      supabase.removeChannel(channel);
    };
  }, [groupId, router]);

  return null;
}
