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
import { Check, Loader2, Share2, UserPlus } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [isQrOpen, setIsQrOpen] = useState(false);

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
    <div className="space-y-2">
      <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy || !urlReady}
        onClick={() => void copyInviteUrl()}
        className="min-h-[44px] flex-1 gap-1.5 md:min-h-0"
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : copied ? (
          <Check className="size-3.5 text-emerald-600" aria-hidden />
        ) : (
          <UserPlus className="size-3.5" aria-hidden />
        )}
        <span className="truncate">
          {copied
            ? inviteTranslations("copied")
            : inviteTranslations("copyInviteButton")}
        </span>
      </Button>
      {canShare ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy || !urlReady}
          onClick={() => void shareInviteUrl()}
          className="min-h-[44px] flex-1 gap-1.5 md:min-h-0"
        >
          <Share2 className="size-3.5" aria-hidden />
          <span className="truncate">{inviteTranslations("shareButton")}</span>
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!urlReady}
        onClick={() => setIsQrOpen(true)}
        className="min-h-[44px] flex-1 gap-1.5 md:min-h-0"
      >
        <span className="truncate">{inviteTranslations("qrToggle")}</span>
      </Button>
      </div>
      {message ? (
        <p className="text-xs text-destructive" role="alert">
          {message}
        </p>
      ) : null}
      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="max-w-[92vw] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{inviteTranslations("qrToggle")}</DialogTitle>
            <DialogDescription>{inviteTranslations("qrHint")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-2 rounded-lg bg-white p-4">
            <QRCodeSVG value={inviteUrl} size={220} marginSize={2} level="M" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
