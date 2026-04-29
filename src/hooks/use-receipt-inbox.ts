"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addReceiptInboxRecord,
  getReceiptInboxRecordById,
  listReceiptInboxRecords,
  removeReceiptInboxRecord,
  type ReceiptInboxRecord,
} from "@/lib/receipt-inbox-db";

export type ReceiptInboxItem = {
  id: string;
  createdAt: string;
  imageBlob: Blob;
};

export function useReceiptInbox(userKey: string) {
  const [items, setItems] = useState<ReceiptInboxItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const records = await listReceiptInboxRecords(userKey);
      setItems(
        records.map((record) => ({
          id: record.id,
          createdAt: record.createdAt,
          imageBlob: record.imageBlob,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, [userKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addImage = useCallback(
    async (imageBlob: Blob) => {
      const record: ReceiptInboxRecord = {
        id: crypto.randomUUID(),
        userKey,
        createdAt: new Date().toISOString(),
        imageBlob,
      };
      await addReceiptInboxRecord(record);
      await refresh();
      return record.id;
    },
    [refresh, userKey],
  );

  const removeById = useCallback(
    async (id: string) => {
      await removeReceiptInboxRecord(id);
      await refresh();
    },
    [refresh],
  );

  const findById = useCallback(async (id: string): Promise<ReceiptInboxItem | null> => {
    const record = await getReceiptInboxRecordById(id);
    if (!record || record.userKey !== userKey) {
      return null;
    }
    return {
      id: record.id,
      createdAt: record.createdAt,
      imageBlob: record.imageBlob,
    };
  }, [userKey]);

  const count = useMemo(() => items.length, [items.length]);

  return {
    items,
    count,
    loading,
    refresh,
    addImage,
    removeById,
    findById,
  };
}
