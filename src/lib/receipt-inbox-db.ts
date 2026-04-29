import { openDB } from "idb";

export const RECEIPT_INBOX_DB_NAME = "splitrip-receipt-inbox";
const RECEIPT_INBOX_STORE = "receipts";

export type ReceiptInboxRecord = {
  id: string;
  userKey: string;
  createdAt: string;
  imageBlob: Blob;
};

type ReceiptInboxDatabase = {
  receipts: ReceiptInboxRecord;
};

async function getReceiptInboxDatabase() {
  return openDB<ReceiptInboxDatabase>(RECEIPT_INBOX_DB_NAME, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(RECEIPT_INBOX_STORE)) {
        const store = database.createObjectStore(RECEIPT_INBOX_STORE, {
          keyPath: "id",
        });
        store.createIndex("by-user-created-at", ["userKey", "createdAt"]);
      }
    },
  });
}

export async function addReceiptInboxRecord(record: ReceiptInboxRecord): Promise<void> {
  const database = await getReceiptInboxDatabase();
  await database.put(RECEIPT_INBOX_STORE, record);
}

export async function listReceiptInboxRecords(userKey: string): Promise<ReceiptInboxRecord[]> {
  const database = await getReceiptInboxDatabase();
  const transaction = database.transaction(RECEIPT_INBOX_STORE, "readonly");
  const index = transaction.store.index("by-user-created-at");
  const records = await index.getAll(IDBKeyRange.bound([userKey, ""], [userKey, "\uffff"]));
  return records.sort((leftRecord, rightRecord) =>
    rightRecord.createdAt.localeCompare(leftRecord.createdAt),
  );
}

export async function getReceiptInboxRecordById(
  id: string,
): Promise<ReceiptInboxRecord | null> {
  const database = await getReceiptInboxDatabase();
  const record = await database.get(RECEIPT_INBOX_STORE, id);
  return record ?? null;
}

export async function removeReceiptInboxRecord(id: string): Promise<void> {
  const database = await getReceiptInboxDatabase();
  await database.delete(RECEIPT_INBOX_STORE, id);
}
