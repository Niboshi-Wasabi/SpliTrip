"use client";

/**
 * Copy / Web Share / QR code for invite URL.
 * 招待 URL のコピー・共有・QR コード表示。
 *
 * QR コードは対面やグループチャットで即座にスキャンできるため、
 * URL を手入力する手間を省き、外出先での招待をスムーズにする。
 * QR code enables instant scanning in person or chat, removing the need to type URLs manually.
 */

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, ChevronUp, Loader2, Share2, UserPlus } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";

type Props = {
  /** Path beginning with `/`, e.g. `/join/<uuid>`. */
  invitePath: string;
  groupName: string;
};

export function GroupInviteButton({ invitePath, groupName }: Props) {
  const inviteTranslations = useTranslations("Invite");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [showQr, setShowQr] = useState(false);

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
      setMessage(inviteTranslations("copyFailed"));
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
        text: inviteTranslations("shareText", { groupName }),
        url: inviteUrl,
      });
    } catch (shareError) {
      const errorName =
        shareError instanceof Error ? shareError.name : "";
      if (errorName !== "AbortError") {
        setMessage(inviteTranslations("shareFailed"));
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
        {copied
          ? inviteTranslations("copied")
          : inviteTranslations("copyInviteButton")}
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
          {inviteTranslations("shareButton")}
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={!urlReady}
        onClick={() => setShowQr((previous) => !previous)}
        className="min-h-[44px] gap-1.5 md:min-h-0"
      >
        {showQr ? (
          <ChevronUp className="size-3.5" aria-hidden />
        ) : (
          <ChevronDown className="size-3.5" aria-hidden />
        )}
        {inviteTranslations("qrToggle")}
      </Button>
      {message ? (
        <p className="text-xs text-destructive" role="alert">
          {message}
        </p>
      ) : null}

      {/* QR コード: 対面での招待に便利 / QR code for in-person invitations */}
      {showQr && urlReady ? (
        <div className="mt-2 flex flex-col items-center gap-2 rounded-lg border border-border bg-white p-4 dark:bg-white">
          <QRCodeSVG
            value={inviteUrl}
            size={200}
            marginSize={2}
            level="M"
          />
          <p className="text-center text-xs text-gray-600">
            {inviteTranslations("qrHint")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
