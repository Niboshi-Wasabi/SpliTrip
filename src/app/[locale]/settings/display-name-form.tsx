"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  initialDisplayName: string;
};

export function DisplayNameForm({ initialDisplayName }: Props) {
  const t = useTranslations("DisplayName");
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (trimmed.length === 0) {
      setError(t("required"));
      return;
    }
    if (trimmed.length > 50) {
      setError(t("tooLong"));
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    const res = await fetch("/api/profile/display-name", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: trimmed }),
    });

    if (!res.ok) {
      setError(t("saveError"));
      setSaving(false);
      return;
    }

    const body = (await res.json()) as { display_name: string };
    setDisplayName(body.display_name);
    setMessage(t("saved"));
    setSaving(false);
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="display_name">{t("label")}</Label>
        <Input
          id="display_name"
          name="display_name"
          type="text"
          autoComplete="name"
          placeholder={t("placeholder")}
          value={displayName}
          maxLength={50}
          disabled={saving}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          {t("hint")}
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">{error}</p>
      ) : null}
      {message ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
          {message}
        </p>
      ) : null}

      <Button type="submit" disabled={saving} className="gap-2">
        {saving ? (
          <>
            <Loader2 className="size-4 shrink-0 animate-spin" />
            {t("saving")}
          </>
        ) : (
          t("save")
        )}
      </Button>
    </form>
  );
}
