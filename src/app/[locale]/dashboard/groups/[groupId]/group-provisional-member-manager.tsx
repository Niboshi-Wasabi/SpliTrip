"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import type { GroupMemberRow } from "@/lib/group-queries";

type Props = {
  groupId: string;
  canManage: boolean;
  members: GroupMemberRow[];
};

export function GroupProvisionalMemberManager({
  groupId,
  canManage,
  members,
}: Props) {
  const router = useRouter();
  const locale = useLocale();
  const translations = useTranslations("GroupDetail");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  if (!canManage) {
    return null;
  }

  const provisionalMembers = members.filter(
    (memberRow) => memberRow.is_provisional === true,
  );

  async function handleAddProvisionalMember(): Promise<void> {
    const rawName = window.prompt(translations("provisionalPrompt"));
    const provisionalName = rawName?.trim() ?? "";
    if (!provisionalName) {
      return;
    }
    setBusyUserId("__add__");
    try {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provisional_display_name: provisionalName }),
      });
      if (!response.ok) {
        throw new Error("add_failed");
      }
      router.refresh();
    } catch {
      window.alert(translations("provisionalAddFailed"));
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleDeleteProvisionalMember(memberUserId: string): Promise<void> {
    setBusyUserId(memberUserId);
    try {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: memberUserId }),
      });
      if (!response.ok) {
        throw new Error("delete_failed");
      }
      router.refresh();
    } catch {
      window.alert(translations("provisionalDeleteFailed"));
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-[var(--apple-separator)] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-[var(--apple-text-secondary)]">
          {translations("provisionalHint")}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-[44px] md:min-h-0"
          disabled={busyUserId === "__add__"}
          onClick={() => void handleAddProvisionalMember()}
        >
          {translations("addProvisionalMember")}
        </Button>
      </div>
      {provisionalMembers.length > 0 ? (
        <ul className="space-y-1">
          {provisionalMembers.map((memberRow) => (
            <li key={memberRow.user_id} className="flex items-center justify-between gap-2">
              <span className="text-sm">{memberRow.display_name}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busyUserId === memberRow.user_id}
                onClick={() => void handleDeleteProvisionalMember(memberRow.user_id)}
              >
                {translations("removeProvisionalMember")}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-[var(--apple-text-secondary)]">
          {translations("provisionalEmpty")}
        </p>
      )}
      <p className="text-xs text-[var(--apple-text-secondary)]">
        {locale === "ja"
          ? "仮メンバーは招待前の名前だけ参加者です。後から実ユーザーで招待し直してください。"
          : "Provisional members are name-only participants before invite. Later, invite the actual user account."}
      </p>
    </div>
  );
}
