import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/utils/supabase/env";

export const SYSTEM_STATUS_SERVICE_KEYS = [
  "core_api_database",
  "authentication",
  "stripe_payments",
  "receipt_ai",
  "web_push_notifications",
] as const;

export type SystemStatusServiceKey = (typeof SYSTEM_STATUS_SERVICE_KEYS)[number];

export const SYSTEM_STATUS_VALUES = [
  "operational",
  "degraded",
  "partial_outage",
  "major_outage",
] as const;

export type SystemOperationalStatus = (typeof SYSTEM_STATUS_VALUES)[number];

export type SystemStatusRow = {
  service_key: SystemStatusServiceKey;
  status: SystemOperationalStatus;
  updated_at: string;
};

/** 管理 API のレスポンスでピン状態を返すときに使う。公開ページでは省略可。 */
export type SystemStatusAdminRow = SystemStatusRow & {
  pinned_by_admin: boolean;
};

const STATUS_RANK: Record<SystemOperationalStatus, number> = {
  operational: 1,
  degraded: 2,
  partial_outage: 3,
  major_outage: 4,
};

/** 複数コンポーネントの集約サマリー（最も悪い状態を採用）。 */
export function rollupSystemStatuses(
  statuses: readonly SystemOperationalStatus[],
): SystemOperationalStatus {
  if (statuses.length === 0) {
    return "operational";
  }
  let worst: SystemOperationalStatus = "operational";
  for (const entry of statuses) {
    if (STATUS_RANK[entry] > STATUS_RANK[worst]) {
      worst = entry;
    }
  }
  return worst;
}

function isOperationalStatus(value: unknown): value is SystemOperationalStatus {
  return (
    typeof value === "string" &&
    (SYSTEM_STATUS_VALUES as readonly string[]).includes(value)
  );
}

function isServiceKey(value: unknown): value is SystemStatusServiceKey {
  return (
    typeof value === "string" &&
    (SYSTEM_STATUS_SERVICE_KEYS as readonly string[]).includes(value)
  );
}

/**
 * RLS: anon でも `system_status` を SELECT 可。公開ステータスページ用。
 */
export async function fetchPublicSystemStatusRows(): Promise<SystemStatusRow[]> {
  const env = getSupabaseEnv();
  if (!env) {
    return [];
  }
  const supabase = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("system_status")
    .select("service_key, status, updated_at")
    .order("service_key", { ascending: true });

  if (error) {
    console.error("[fetchPublicSystemStatusRows]:", error);
    return [];
  }

  const rows: SystemStatusRow[] = [];
  for (const row of data ?? []) {
    if (!isServiceKey(row.service_key) || !isOperationalStatus(row.status)) {
      continue;
    }
    rows.push({
      service_key: row.service_key,
      status: row.status,
      updated_at: String(row.updated_at ?? ""),
    });
  }
  return sortSystemStatusRowsByKnownOrder(rows);
}

/**
 * 公開 API の JSON アイテム配列から `SystemStatusRow[]` へ検証のみ（匿名クライアント向け）。
 */
export function sanitizePublicStatusPayloadItems(payload: unknown): SystemStatusRow[] {
  if (!Array.isArray(payload)) {
    return [];
  }
  const rows: SystemStatusRow[] = [];
  for (const entry of payload) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }
    const record = entry as Record<string, unknown>;
    if (!isServiceKey(record.service_key) || !isOperationalStatus(record.status)) {
      continue;
    }
    rows.push({
      service_key: record.service_key,
      status: record.status,
      updated_at: String(record.updated_at ?? ""),
    });
  }
  return sortSystemStatusRowsByKnownOrder(rows);
}

/**
 * DB に無いサービスキーは operational として補完（一覧の安定表示用）。
 * 欠損時の updated_at は呼び出し側の現在時刻。
 */
export function mergeMissingSystemStatusRows(
  rowsFromDatabase: SystemStatusRow[],
): SystemStatusRow[] {
  const rowsByServiceKey = new Map(
    rowsFromDatabase.map((statusRow) => [
      statusRow.service_key,
      statusRow,
    ] as const),
  );
  return SYSTEM_STATUS_SERVICE_KEYS.map((serviceKeyDefinition) => {
    const storedRow = rowsByServiceKey.get(serviceKeyDefinition);
    if (storedRow) {
      return storedRow;
    }
    return {
      service_key: serviceKeyDefinition,
      status: "operational" satisfies SystemOperationalStatus,
      updated_at: new Date().toISOString(),
    };
  });
}

export function sortSystemStatusRowsByKnownOrder(
  rows: SystemStatusRow[],
): SystemStatusRow[] {
  const orderMap = new Map<string, number>(
    SYSTEM_STATUS_SERVICE_KEYS.map((serviceKey, serviceIndex) => [
      serviceKey,
      serviceIndex,
    ]),
  );
  return [...rows].sort((leftRow, rightRow) => {
    const leftOrder = orderMap.get(leftRow.service_key) ?? 999;
    const rightOrder = orderMap.get(rightRow.service_key) ?? 999;
    return leftOrder - rightOrder;
  });
}

export type SystemStatusUpdatePayloadItem = {
  service_key: SystemStatusServiceKey;
  status: SystemOperationalStatus;
  /** undefined のとき PUT 側で DB の既存値を維持する。 */
  pinned_by_admin?: boolean;
};

export function parseSystemStatusPayload(
  items: unknown,
):
  | { ok: true; updates: SystemStatusUpdatePayloadItem[] }
  | { ok: false; message: "invalid_payload" } {
  if (!Array.isArray(items)) {
    return { ok: false, message: "invalid_payload" };
  }
  const updates: SystemStatusUpdatePayloadItem[] = [];
  for (const entry of items) {
    if (typeof entry !== "object" || entry === null) {
      return { ok: false, message: "invalid_payload" };
    }
    const record = entry as Record<string, unknown>;
    if (!isServiceKey(record.service_key) || !isOperationalStatus(record.status)) {
      return { ok: false, message: "invalid_payload" };
    }
    const pinRaw = record.pinned_by_admin;
    if (
      pinRaw !== undefined &&
      pinRaw !== null &&
      typeof pinRaw !== "boolean"
    ) {
      return { ok: false, message: "invalid_payload" };
    }
    const nextItem: SystemStatusUpdatePayloadItem = {
      service_key: record.service_key,
      status: record.status,
    };
    if (typeof pinRaw === "boolean") {
      nextItem.pinned_by_admin = pinRaw;
    }
    updates.push(nextItem);
  }
  return { ok: true, updates };
}
