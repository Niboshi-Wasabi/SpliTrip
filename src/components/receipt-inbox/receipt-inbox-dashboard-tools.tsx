"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Camera, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReceiptInbox } from "@/hooks/use-receipt-inbox";

type GroupOption = {
  id: string;
  name: string;
};

type Props = {
  currentUserId: string;
  groups: GroupOption[];
};

function useBlobPreviewUrl(blob: Blob): string {
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => {
    return () => URL.revokeObjectURL(url);
  }, [url]);
  return url;
}

function ReceiptThumbnail({ blob }: { blob: Blob }) {
  const blobPreviewUrl = useBlobPreviewUrl(blob);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Blob URL preview for local inbox item.
    <img
      src={blobPreviewUrl}
      alt=""
      className="h-28 w-full rounded-md object-cover"
    />
  );
}

export function ReceiptInboxDashboardTools({ currentUserId, groups }: Props) {
  const receiptInboxTranslations = useTranslations("ReceiptInbox");
  const router = useRouter();
  const fileInputReference = useRef<HTMLInputElement>(null);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedGroupByReceiptId, setSelectedGroupByReceiptId] = useState<
    Record<string, string>
  >({});
  const { items, count, addImage, removeById, loading } = useReceiptInbox(
    currentUserId,
  );

  function openCameraPicker() {
    fileInputReference.current?.click();
  }

  async function handleFileChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) {
      return;
    }
    await addImage(file);
    setToastMessage(receiptInboxTranslations("savedToast"));
    setTimeout(() => {
      setToastMessage(null);
    }, 1600);
  }

  function selectedGroupIdForReceipt(receiptId: string): string | null {
    const selectedGroupId = selectedGroupByReceiptId[receiptId];
    if (selectedGroupId) {
      return selectedGroupId;
    }
    return groups[0]?.id ?? null;
  }

  function openStickyViewer(receiptId: string) {
    const selectedGroupId = selectedGroupIdForReceipt(receiptId);
    if (!selectedGroupId) {
      return;
    }
    router.push(
      `/dashboard/groups/${selectedGroupId}?receiptInboxId=${encodeURIComponent(receiptId)}`,
    );
  }

  return (
    <>
      <input
        ref={fileInputReference}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          void handleFileChange(event.target.files);
          event.currentTarget.value = "";
        }}
      />

      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px] w-full justify-between"
          onClick={() => setIsInboxOpen(true)}
        >
          <span className="inline-flex items-center gap-2">
            <Inbox className="h-4 w-4" aria-hidden />
            {receiptInboxTranslations("inboxTitle")}
          </span>
          <span className="rounded-full bg-[var(--apple-fill-tertiary)] px-2 py-0.5 text-xs">
            {receiptInboxTranslations("inboxCount", { count })}
          </span>
        </Button>
      </div>

      <Button
        type="button"
        className="fixed right-4 bottom-24 z-40 min-h-[52px] rounded-full px-4 shadow-lg md:bottom-6"
        onClick={openCameraPicker}
      >
        <Camera className="mr-2 h-4 w-4" aria-hidden />
        {receiptInboxTranslations("quickSaveButton")}
      </Button>

      {isInboxOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-3 md:items-center md:justify-center">
          <div className="w-full max-w-3xl rounded-xl border border-[var(--apple-separator)] bg-[var(--apple-card-bg)] p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">
                {receiptInboxTranslations("inboxTitle")}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsInboxOpen(false)}
              >
                {receiptInboxTranslations("close")}
              </Button>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-[var(--apple-text-secondary)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                {receiptInboxTranslations("loading")}
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-[var(--apple-text-secondary)]">
                {receiptInboxTranslations("empty")}
              </p>
            ) : (
              <div className="grid max-h-[60vh] gap-3 overflow-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="space-y-2 rounded-lg border border-[var(--apple-separator)] p-2"
                  >
                    <ReceiptThumbnail blob={item.imageBlob} />
                    <p className="text-xs text-[var(--apple-text-secondary)]">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                    {groups.length > 0 ? (
                      <select
                        className="h-9 w-full rounded-lg border border-[var(--apple-separator)] bg-[var(--apple-surface)] px-2 text-xs text-[var(--apple-text)]"
                        value={selectedGroupIdForReceipt(item.id) ?? ""}
                        onChange={(event) =>
                          setSelectedGroupByReceiptId((previousMap) => ({
                            ...previousMap,
                            [item.id]: event.target.value,
                          }))
                        }
                      >
                        {groups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="min-h-[40px] flex-1"
                        onClick={() => openStickyViewer(item.id)}
                        disabled={groups.length === 0}
                      >
                        {receiptInboxTranslations("openInForm")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="min-h-[40px]"
                        onClick={() => void removeById(item.id)}
                      >
                        {receiptInboxTranslations("deleteFromInbox")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {toastMessage ? (
        <div className="pointer-events-none fixed right-4 bottom-40 z-50 rounded-md border border-[var(--apple-separator)] bg-[var(--apple-card-bg)] px-3 py-2 text-xs shadow-lg md:bottom-20">
          {toastMessage}
        </div>
      ) : null}
    </>
  );
}
