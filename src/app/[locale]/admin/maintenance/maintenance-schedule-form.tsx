"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SafeMarkdown } from "@/components/markdown/safe-markdown";
import { Label } from "@/components/ui/label";
import type { MaintenanceScheduleRow } from "@/lib/maintenance-schedule";

type MaintenanceResponse = {
  ok?: boolean;
  item?: MaintenanceScheduleRow | null;
  message?: string;
};

function toDateTimeLocalValue(isoText: string): string {
  const date = new Date(isoText);
  if (!Number.isFinite(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toIsoOrEmpty(localValue: string): string {
  if (!localValue.trim()) {
    return "";
  }
  const date = new Date(localValue);
  return Number.isFinite(date.getTime()) ? date.toISOString() : "";
}

export function MaintenanceScheduleForm() {
  const adminTranslations = useTranslations("Admin");
  const markdownEditorTranslations = useTranslations("MarkdownEditor");
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [startTimeLocal, setStartTimeLocal] = useState("");
  const [endTimeLocal, setEndTimeLocal] = useState("");
  const [messageJa, setMessageJa] = useState("");
  const [messageEn, setMessageEn] = useState("");
  const [messageUrgencySelection, setMessageUrgencySelection] = useState<
    "unset" | "normal" | "high"
  >("unset");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErrorMessage(null);
    const response = await fetch("/api/admin/maintenance", { cache: "no-store" });
    const body = (await response.json().catch(() => null)) as
      | MaintenanceResponse
      | null;
    if (!response.ok || !body?.ok) {
      setErrorMessage(adminTranslations("maintenanceLoadError"));
      return;
    }
    if (!body.item) {
      setScheduleId(null);
      return;
    }
    setScheduleId(body.item.id);
    setIsEnabled(body.item.is_enabled);
    setStartTimeLocal(toDateTimeLocalValue(body.item.start_time));
    setEndTimeLocal(toDateTimeLocalValue(body.item.end_time));
    setMessageJa(body.item.announcement_message_ja ?? "");
    setMessageEn(body.item.announcement_message_en ?? "");
    if (body.item.message_urgency === "high") {
      setMessageUrgencySelection("high");
    } else if (body.item.message_urgency === "normal") {
      setMessageUrgencySelection("normal");
    } else {
      setMessageUrgencySelection("unset");
    }
  }, [adminTranslations]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setBusy(true);
    setSavedMessage(null);
    setErrorMessage(null);
    const startIso = toIsoOrEmpty(startTimeLocal);
    const endIso = toIsoOrEmpty(endTimeLocal);
    if (!startIso || !endIso) {
      setBusy(false);
      setErrorMessage(adminTranslations("maintenanceInvalidRange"));
      return;
    }

    const response = await fetch("/api/admin/maintenance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: scheduleId ?? undefined,
        is_enabled: isEnabled,
        start_time: startIso,
        end_time: endIso,
        announcement_message_ja: messageJa,
        announcement_message_en: messageEn,
        message_urgency:
          messageUrgencySelection === "unset" ? null : messageUrgencySelection,
      }),
    });
    const body = (await response.json().catch(() => null)) as
      | MaintenanceResponse
      | null;
    if (!response.ok || !body?.ok || !body.item) {
      setBusy(false);
      setErrorMessage(adminTranslations("maintenanceSaveError"));
      return;
    }
    setScheduleId(body.item.id);
    setSavedMessage(adminTranslations("maintenanceSaved"));
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {savedMessage ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
          {savedMessage}
        </p>
      ) : null}

      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex items-center gap-2">
          <input
            id="maintenance-enabled"
            type="checkbox"
            className="h-4 w-4"
            checked={isEnabled}
            onChange={(event) => setIsEnabled(event.target.checked)}
          />
          <Label htmlFor="maintenance-enabled">
            {adminTranslations("maintenanceEnabled")}
          </Label>
        </div>
      </div>

      <div className="space-y-1.5 rounded-lg border border-border p-4">
        <Label htmlFor="maintenance-message-urgency">
          {adminTranslations("maintenanceMessageUrgencyLabel")}
        </Label>
        <select
          id="maintenance-message-urgency"
          value={messageUrgencySelection}
          onChange={(event) =>
            setMessageUrgencySelection(event.target.value as "unset" | "normal" | "high")
          }
          className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full max-w-md rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <option value="unset">
            {adminTranslations("maintenanceMessageUrgencyUnset")}
          </option>
          <option value="normal">
            {adminTranslations("maintenanceMessageUrgencyNormal")}
          </option>
          <option value="high">
            {adminTranslations("maintenanceMessageUrgencyHigh")}
          </option>
        </select>
        <p className="text-xs text-muted-foreground">
          {adminTranslations("maintenanceMessageUrgencyHint")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="maintenance-start">{adminTranslations("maintenanceStartTime")}</Label>
          <Input
            id="maintenance-start"
            type="datetime-local"
            value={startTimeLocal}
            onChange={(event) => setStartTimeLocal(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="maintenance-end">{adminTranslations("maintenanceEndTime")}</Label>
          <Input
            id="maintenance-end"
            type="datetime-local"
            value={endTimeLocal}
            onChange={(event) => setEndTimeLocal(event.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="maintenance-message-ja">{adminTranslations("maintenanceMessageJa")}</Label>
          <textarea
            id="maintenance-message-ja"
            rows={12}
            spellCheck={false}
            className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm leading-relaxed min-h-[200px]"
            value={messageJa}
            onChange={(event) => setMessageJa(event.target.value)}
            aria-describedby="maintenance-message-ja-hint"
          />
          <p id="maintenance-message-ja-hint" className="text-xs text-muted-foreground">
            {markdownEditorTranslations("hint")}
          </p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {markdownEditorTranslations("input")}
          </p>
        </div>
        <div className="flex flex-col gap-2 min-h-[200px]">
          <span className="text-sm font-medium">{markdownEditorTranslations("preview")}</span>
          <div className="min-h-[200px] flex-1 overflow-auto rounded-md border border-border bg-muted/30 p-3">
            {messageJa.trim() ? (
              <SafeMarkdown
                markdown={messageJa}
                className="prose prose-invert prose-sm max-h-[min(50vh,28rem)] max-w-none"
              />
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="maintenance-message-en">{adminTranslations("maintenanceMessageEn")}</Label>
          <textarea
            id="maintenance-message-en"
            rows={12}
            spellCheck={false}
            className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm leading-relaxed min-h-[200px]"
            value={messageEn}
            onChange={(event) => setMessageEn(event.target.value)}
            aria-describedby="maintenance-message-en-hint"
          />
          <p id="maintenance-message-en-hint" className="text-xs text-muted-foreground">
            {markdownEditorTranslations("hint")}
          </p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {markdownEditorTranslations("input")}
          </p>
        </div>
        <div className="flex flex-col gap-2 min-h-[200px]">
          <span className="text-sm font-medium">{markdownEditorTranslations("preview")}</span>
          <div className="min-h-[200px] flex-1 overflow-auto rounded-md border border-border bg-muted/30 p-3">
            {messageEn.trim() ? (
              <SafeMarkdown
                markdown={messageEn}
                className="prose prose-invert prose-sm max-h-[min(50vh,28rem)] max-w-none"
              />
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        </div>
      </div>

      <Button
        type="button"
        className="min-h-[44px]"
        onClick={() => void save()}
        disabled={busy}
      >
        {busy ? adminTranslations("saving") : adminTranslations("maintenanceSaveButton")}
      </Button>
    </div>
  );
}
