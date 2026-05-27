"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  SYSTEM_STATUS_SERVICE_KEYS,
  SYSTEM_STATUS_VALUES,
  type SystemOperationalStatus,
  type SystemStatusServiceKey,
} from "@/lib/system-status";

type StatusRowPayload = {
  service_key: SystemStatusServiceKey;
  status: SystemOperationalStatus;
  updated_at: string;
  pinned_by_admin: boolean;
};

type StatusApiResponse =
  | { ok: true; items: StatusRowPayload[] }
  | { ok: false; message?: string };

function serviceTranslationKey(serviceKey: SystemStatusServiceKey): string {
  switch (serviceKey) {
    case "core_api_database":
      return "systemStatusServiceCoreApiDatabase";
    case "authentication":
      return "systemStatusServiceAuthentication";
    case "stripe_payments":
      return "systemStatusServiceStripePayments";
    case "receipt_ai":
      return "systemStatusServiceReceiptAi";
    case "web_push_notifications":
      return "systemStatusServiceWebPush";
    default: {
      const exhaustiveCheck: never = serviceKey;
      return exhaustiveCheck;
    }
  }
}

function statusTranslationKey(status: SystemOperationalStatus): string {
  switch (status) {
    case "operational":
      return "systemStatusOperational";
    case "degraded":
      return "systemStatusDegraded";
    case "partial_outage":
      return "systemStatusPartialOutage";
    case "major_outage":
      return "systemStatusMajorOutage";
    default: {
      const exhaustiveCheck: never = status;
      return exhaustiveCheck;
    }
  }
}

export function SystemStatusAdminForm() {
  const t = useTranslations("Admin");
  const [busy, setBusy] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  const [selectionByService, setSelectionByService] = useState<
    Record<SystemStatusServiceKey, SystemOperationalStatus>
  >(() =>
    SYSTEM_STATUS_SERVICE_KEYS.reduce(
      (accumulator, serviceKey) => {
        accumulator[serviceKey] = "operational";
        return accumulator;
      },
      {} as Record<SystemStatusServiceKey, SystemOperationalStatus>,
    ),
  );

  const [pinnedByService, setPinnedByService] = useState<
    Record<SystemStatusServiceKey, boolean>
  >(() =>
    SYSTEM_STATUS_SERVICE_KEYS.reduce(
      (accumulator, serviceKey) => {
        accumulator[serviceKey] = false;
        return accumulator;
      },
      {} as Record<SystemStatusServiceKey, boolean>,
    ),
  );

  const loadRows = useCallback(async () => {
    setLoadErrorMessage(null);
    const response = await fetch("/api/admin/status", {
      credentials: "include",
      cache: "no-store",
    });
    const body = (await response.json().catch(() => null)) as StatusApiResponse | null;
    if (!response.ok || !body?.ok || !Array.isArray(body.items)) {
      setLoadErrorMessage(t("systemStatusLoadError"));
      return;
    }
    const nextStatusMap: Record<
      SystemStatusServiceKey,
      SystemOperationalStatus
    > = SYSTEM_STATUS_SERVICE_KEYS.reduce(
      (accumulator, serviceKey) => {
        accumulator[serviceKey] = "operational";
        return accumulator;
      },
      {} as Record<SystemStatusServiceKey, SystemOperationalStatus>,
    );
    const nextPinMap: Record<SystemStatusServiceKey, boolean> =
      SYSTEM_STATUS_SERVICE_KEYS.reduce(
        (accumulator, serviceKey) => {
          accumulator[serviceKey] = false;
          return accumulator;
        },
        {} as Record<SystemStatusServiceKey, boolean>,
      );

    for (const row of body.items) {
      if (SYSTEM_STATUS_SERVICE_KEYS.includes(row.service_key)) {
        nextStatusMap[row.service_key] = row.status;
        nextPinMap[row.service_key] = row.pinned_by_admin === true;
      }
    }
    setSelectionByService(nextStatusMap);
    setPinnedByService(nextPinMap);
  }, [t]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const orderedSelections = useMemo(() => {
    return SYSTEM_STATUS_SERVICE_KEYS.map((serviceKey) => ({
      serviceKey,
      status: selectionByService[serviceKey],
      pinned: pinnedByService[serviceKey],
    }));
  }, [pinnedByService, selectionByService]);

  async function saveAll() {
    setBusy(true);
    setSavedBanner(null);
    setSaveErrorMessage(null);
    const items = SYSTEM_STATUS_SERVICE_KEYS.map((serviceKey) => ({
      service_key: serviceKey,
      status: selectionByService[serviceKey],
      pinned_by_admin: pinnedByService[serviceKey],
    }));
    const response = await fetch("/api/admin/status", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const body = (await response.json().catch(() => null)) as StatusApiResponse | null;
    setBusy(false);
    if (!response.ok || !body?.ok || !body.items) {
      setSaveErrorMessage(t("systemStatusSaveError"));
      return;
    }
    const nextStatuses: Record<SystemStatusServiceKey, SystemOperationalStatus> =
      SYSTEM_STATUS_SERVICE_KEYS.reduce(
        (accumulator, serviceKeyDefinition) => {
          accumulator[serviceKeyDefinition] = selectionByService[serviceKeyDefinition];
          return accumulator;
        },
        {} as Record<SystemStatusServiceKey, SystemOperationalStatus>,
      );
    const nextPins: Record<SystemStatusServiceKey, boolean> =
      SYSTEM_STATUS_SERVICE_KEYS.reduce(
        (accumulator, serviceKeyDefinition) => {
          accumulator[serviceKeyDefinition] =
            pinnedByService[serviceKeyDefinition];
          return accumulator;
        },
        {} as Record<SystemStatusServiceKey, boolean>,
      );
    for (const row of body.items) {
      if (SYSTEM_STATUS_SERVICE_KEYS.includes(row.service_key)) {
        nextStatuses[row.service_key] = row.status;
        nextPins[row.service_key] = row.pinned_by_admin === true;
      }
    }
    setSelectionByService(nextStatuses);
    setPinnedByService(nextPins);
    setSavedBanner(t("systemStatusSaved"));
  }

  return (
    <div className="space-y-6">
      {loadErrorMessage ? (
        <p className="text-sm text-red-500" role="alert">
          {loadErrorMessage}
        </p>
      ) : null}
      {saveErrorMessage ? (
        <p className="text-sm text-red-500" role="alert">
          {saveErrorMessage}
        </p>
      ) : null}
      {savedBanner ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
          {savedBanner}
        </p>
      ) : null}

      <p className="text-sm text-[var(--apple-text-secondary)]">{t("systemStatusHint")}</p>

      <div className="space-y-4">
        {orderedSelections.map(({ serviceKey, status, pinned }) => (
          <div
            key={serviceKey}
            className="flex flex-col gap-3 rounded-lg border border-[var(--apple-separator)] bg-[var(--apple-card-bg)]/40 p-4 sm:gap-4"
          >
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-medium">{t(serviceTranslationKey(serviceKey))}</p>
              <div className="w-full shrink-0 sm:w-72">
                <Label htmlFor={`status_${serviceKey}`} className="sr-only">
                  {t(serviceTranslationKey(serviceKey))}
                </Label>
                <select
                  id={`status_${serviceKey}`}
                  value={status}
                  onChange={(event) =>
                    setSelectionByService((current) => ({
                      ...current,
                      [serviceKey]: event.target
                        .value as SystemOperationalStatus,
                    }))
                  }
                  disabled={busy}
                  className="flex h-11 min-h-[44px] w-full rounded-lg border border-[var(--apple-separator)] bg-[var(--apple-surface)] px-3 py-2 text-sm text-[var(--apple-text)] outline-none transition focus:border-[var(--apple-link)] focus:ring-2 focus:ring-[var(--apple-link)]/20"
                >
                  {SYSTEM_STATUS_VALUES.map((statusValue) => (
                    <option key={statusValue} value={statusValue}>
                      {t(statusTranslationKey(statusValue))}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-[var(--apple-text-secondary)]">
              <input
                type="checkbox"
                checked={pinned}
                disabled={busy}
                onChange={(event) =>
                  setPinnedByService((current) => ({
                    ...current,
                    [serviceKey]: event.target.checked,
                  }))
                }
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--apple-separator)]"
              />
              <span>{t("systemStatusPinLabel")}</span>
            </label>
          </div>
        ))}
      </div>

      <Button
        type="button"
        className="min-h-[44px]"
        disabled={busy}
        onClick={() => void saveAll()}
      >
        {busy ? t("saving") : t("systemStatusSaveButton")}
      </Button>
    </div>
  );
}
