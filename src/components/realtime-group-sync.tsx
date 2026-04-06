"use client";

/**
 * グループページにリアルタイム同期とトースト通知を提供するラッパー。
 * Wrapper that provides realtime sync + toast notification for group pages.
 *
 * postgres_changes とブロードキャストの両方を監視し、
 * 他ユーザーの変更を検知したら「データが更新されました」トーストを表示する。
 * Listens to both postgres_changes and broadcast, showing a toast
 * when another user's change is detected.
 */

import { useCallback, useState } from "react";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { RealtimeToast } from "./realtime-toast";

type Props = {
  groupId: string;
  currentUserId: string;
};

export function RealtimeGroupSync({ groupId, currentUserId }: Props) {
  const [showToast, setShowToast] = useState(false);
  const [toastKey, setToastKey] = useState(0);

  const handleRemoteChange = useCallback(() => {
    setToastKey((previous) => previous + 1);
    setShowToast(true);
  }, []);

  const handleDismiss = useCallback(() => {
    setShowToast(false);
  }, []);

  useRealtimeSync({
    groupId,
    currentUserId,
    onRemoteChange: handleRemoteChange,
  });

  return (
    <RealtimeToast
      key={toastKey}
      show={showToast}
      onDismiss={handleDismiss}
    />
  );
}
