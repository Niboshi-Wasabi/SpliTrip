"use client";

/**
 * Hybrid create flow: server action returns `invite_token` so we can show a share link
 * in the same session without an extra fetch round-trip.
 * ハイブリッド作成: サーバーアクションが invite_token を返し、追加フェッチなしで同一セッションで共有リンクを表示する。
 */

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { createGroupWithInviteAction } from "@/app/actions/create-group-with-invite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PostCreateInviteCard } from "./post-create-invite-card";

/**
 * Form that creates a group and surfaces the invite link immediately (hybrid UX).
 * グループを作成し、招待リンクを即表示するフォーム（ハイブリッド UX）。
 */
export function CreateGroupForm() {
  const t = useTranslations("GroupNew");
  const tErr = useTranslations("GroupNew.errors");
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("JPY");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    groupId: string;
    inviteToken: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t("nameRequiredClient"));
      return;
    }

    setError(null);
    startTransition(() => {
      void (async () => {
        const result = await createGroupWithInviteAction({
          name: trimmedName,
          currencyCode: currency.trim().toUpperCase() || "JPY",
        });

        if (!result.ok) {
          const mapped =
            result.errorCode === "unauthorized"
              ? tErr("unauthorized")
              : result.errorCode === "name_required"
                ? tErr("name_required")
                : result.errorCode === "insert_failed"
                  ? tErr("insert_failed")
                  : result.errorCode === "session_invalid"
                    ? tErr("session_invalid")
                    : result.errorCode === "invalid_response"
                      ? tErr("invalid_response")
                      : null;
          setError(
            mapped ??
              result.message ??
              tErr("fallback", { code: result.errorCode }),
          );
          return;
        }

        setCreated({
          groupId: result.groupId,
          inviteToken: result.inviteToken,
        });
      })();
    });
  }

  if (created) {
    return (
      <div className="flex max-w-md flex-col gap-4">
        <PostCreateInviteCard
          groupId={created.groupId}
          inviteToken={created.inviteToken}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setCreated(null)}
        >
          {t("createAnother")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="group-name">{t("groupNameLabel")}</Label>
        <Input
          id="group-name"
          value={name}
          onChange={(changeEvent) => setName(changeEvent.target.value)}
          placeholder={t("groupNamePlaceholder")}
          disabled={isPending}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="currency">{t("currencyLabel")}</Label>
        <Input
          id="currency"
          value={currency}
          onChange={(changeEvent) => setCurrency(changeEvent.target.value)}
          placeholder={t("currencyPlaceholder")}
          maxLength={3}
          disabled={isPending}
        />
      </div>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        {t("submit")}
      </Button>
    </form>
  );
}
