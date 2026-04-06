"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Pencil, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  currentName: string;
  onSaved?: (newName: string) => void;
};

export function DisplayNamePromptranslations({ currentName, onSaved }: Props) {
  const translations = useTranslations("DisplayName");
  const isDefault = currentName === "ユーザー" || currentName === "User";
  const [name, setName] = useState(isDefault ? "" : currentName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(isDefault);
  const [dismissed, setDismissed] = useState(false);

  if (isDefault && dismissed) return null;

  async function handleSave() {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setError(translations("required"));
      return;
    }
    if (trimmed.length > 50) {
      setError(translations("tooLong"));
      return;
    }

    setSaving(true);
    setError(null);

    const res = await fetch("/api/profile/display-name", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: trimmed }),
    });

    if (!res.ok) {
      setError(translations("saveError"));
      setSaving(false);
      return;
    }

    onSaved?.(trimmed);
    window.location.reload();
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5">
        <UserRound className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-foreground">
          {translations("currentLabel")}: <strong>{currentName}</strong>
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto gap-1.5 text-xs"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-3 w-3" />
          {translations("edit")}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/30">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/50">
          <UserRound className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-100">
              {isDefault ? translations("title") : translations("editTitle")}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {translations("description")}
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={translations("placeholder")}
              maxLength={50}
              className="max-w-xs bg-white dark:bg-background"
              disabled={saving}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefaultranslations();
                  void handleSave();
                }
              }}
            />
            <Button
              size="sm"
              disabled={saving || name.trim().length === 0}
              onClick={() => void handleSave()}
            >
              {saving ? (
                <Loader2 className="size-4 shrink-0 animate-spin" />
              ) : (
                translations("save")
              )}
            </Button>
            {isDefault ? (
              <Button
                size="sm"
                variant="ghost"
                disabled={saving}
                onClick={() => setDismissed(true)}
              >
                {translations("skip")}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                disabled={saving}
                onClick={() => {
                  setEditing(false);
                  setName(currentName);
                  setError(null);
                }}
              >
                {translations("cancel")}
              </Button>
            )}
          </div>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
