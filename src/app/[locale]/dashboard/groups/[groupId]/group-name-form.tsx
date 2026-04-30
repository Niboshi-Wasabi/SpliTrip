"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const GROUP_NAME_MAX_LENGTH = 100;

type GroupNameFormProps = {
  groupId: string;
  initialName: string;
  canEdit: boolean;
};

export function GroupNameForm({
  groupId,
  initialName,
  canEdit,
}: GroupNameFormProps) {
  const translations = useTranslations("GroupDetail");
  const [editing, setEditing] = useState(false);
  const [committedGroupName, setCommittedGroupName] = useState(initialName);
  const [groupName, setGroupName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!canEdit) {
    return <h1 className="text-lg font-bold text-foreground">{initialName}</h1>;
  }

  async function handleSave() {
    const trimmedGroupName = groupName.trim();
    if (trimmedGroupName.length === 0) {
      setErrorMessage(translations("groupNameRequired"));
      return;
    }
    if (trimmedGroupName.length > GROUP_NAME_MAX_LENGTH) {
      setErrorMessage(translations("groupNameTooLong"));
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedGroupName }),
      });

      const responseBody = (await response.json().catch(() => ({}))) as {
        error?: string;
        group?: { name?: string };
      };

      if (!response.ok) {
        if (responseBody.error === "name_required") {
          setErrorMessage(translations("groupNameRequired"));
          return;
        }
        if (responseBody.error === "name_too_long") {
          setErrorMessage(translations("groupNameTooLong"));
          return;
        }
        setErrorMessage(translations("groupNameSaveError"));
        return;
      }

      const nextName =
        typeof responseBody.group?.name === "string"
          ? responseBody.group.name
          : trimmedGroupName;
      setCommittedGroupName(nextName);
      setGroupName(nextName);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold text-foreground">{groupName}</h1>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 px-2"
          onClick={() => setEditing(true)}
        >
          <Pencil className="mr-1 h-3.5 w-3.5" />
          {translations("editGroupName")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={groupName}
          onChange={(changeEvent) => setGroupName(changeEvent.target.value)}
          maxLength={GROUP_NAME_MAX_LENGTH}
          disabled={saving}
          className="h-9 max-w-sm"
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            {translations("saveGroupName")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={saving}
            onClick={() => {
              setEditing(false);
              setGroupName(committedGroupName);
              setErrorMessage(null);
            }}
          >
            {translations("cancelGroupName")}
          </Button>
        </div>
      </div>
      {errorMessage ? (
        <p className="text-xs text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
