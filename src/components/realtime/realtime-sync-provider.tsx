"use client";

import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { RealtimeToast } from "@/components/realtime-toast";

type RealtimeSyncContextType = {
  showUpdateNotification: (message?: string) => void;
  isOnline: boolean;
};

const RealtimeSyncContext = createContext<RealtimeSyncContextType>({
  showUpdateNotification: () => {},
  isOnline: true,
});

export function RealtimeSyncProvider({ children }: { children: ReactNode }) {
  const [showToast, setShowToast] = useState(false);
  const [toastKey, setToastKey] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | undefined>();
  const [isOnline, setIsOnline] = useState(true);

  const showUpdateNotification = useCallback((message?: string) => {
    setToastMessage(message);
    setToastKey((prev) => prev + 1);
    setShowToast(true);
  }, []);

  const handleDismiss = useCallback(() => {
    setShowToast(false);
    setToastMessage(undefined);
  }, []);

  // オンライン/オフライン状態の監視
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const contextValue: RealtimeSyncContextType = {
    showUpdateNotification,
    isOnline,
  };

  return (
    <RealtimeSyncContext.Provider value={contextValue}>
      {children}
      
      {/* グローバルトースト */}
      <RealtimeToast
        key={toastKey}
        show={showToast}
        onDismiss={handleDismiss}
        message={toastMessage}
      />
      
      {/* オフライン通知 */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white text-center py-2 text-sm">
          オフラインです - 接続が復旧すると自動で同期されます
        </div>
      )}
    </RealtimeSyncContext.Provider>
  );
}

export const useRealtimeSync = () => useContext(RealtimeSyncContext);