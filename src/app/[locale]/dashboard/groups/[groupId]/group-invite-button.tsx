"use client";

/**
 * Copy or Web Share the absolute invite URL built from `invitePath` + `window.location.origin`.
 */

import { useEffect, useState } from "react";
import { Check, Loader2, Share2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  /** Path beginning with `/`, e.g. `/join/<uuid>`. */
  invitePath: string;
  groupName: string;
};

export function GroupInviteButton({ invitePath, groupName }: Props) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setInviteUrl(`${window.location.origin}${invitePath}`);
  }, [invitePath]);

  async function copyInviteUrl() {
    setMessage(null);
    setBusy(true);
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setMessage("クリップボードにコピーできませんでした。");
    } finally {
      setBusy(false);
    }
  }

  async function shareInviteUrl() {
    setMessage(null);
    if (!navigator.share) {
      return;
    }
    setBusy(true);
    try {
      await navigator.share({
        title: `${groupName} — SpliTrip`,
        text: `「${groupName}」の割り勘グループに参加してください`,
        url: inviteUrl,
      });
    } catch (shareError) {
      const errorName =
        shareError instanceof Error ? shareError.name : "";
      if (errorName !== "AbortError") {
        setMessage("共有を開始できませんでした。");
      }
    } finally {
      setBusy(false);
    }
  }

  const urlReady = inviteUrl.startsWith("http");

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy || !urlReady}
        onClick={() => void copyInviteUrl()}
        className="min-h-[44px] gap-1.5 md:min-h-0"
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : copied ? (
          <Check className="size-3.5 text-emerald-600" aria-hidden />
        ) : (
          <UserPlus className="size-3.5" aria-hidden />
        )}
        {copied ? "コピーしました" : "メンバーを招待（リンクをコピー）"}
      </Button>
      {canShare ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy || !urlReady}
          onClick={() => void shareInviteUrl()}
          className="min-h-[44px] gap-1.5 md:min-h-0"
        >
          <Share2 className="size-3.5" aria-hidden />
          共有で送る
        </Button>
      ) : null}
      {message ? (
        <p className="text-xs text-destructive" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
