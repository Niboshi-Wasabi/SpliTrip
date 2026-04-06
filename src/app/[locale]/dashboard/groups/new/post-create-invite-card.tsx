"use client";

/**
 * Shown after hybrid create: copy invite URL or open the new group dashboard.
 * ハイブリッド作成後に表示し、招待 URL のコピーまたはグループ画面へ遷移できるようにする。
 */

import { useState, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { localizedJoinPath } from "@/lib/i18n/localized-paths";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * No-op: origin string does not change during the SPA session for this use case.
 * オリジン文字列はこの用途では SPA セッション中は変わらないため購読は不要。
 */
function emptyOriginSubscribe(): () => void {
  return () => {};
}

function readWindowOriginSnapshot(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.location.origin;
}

type Props = {
  /** New group id for dashboard navigation / ダッシュボード遷移用の新グループ ID */
  groupId: string;
  /** `groups.invite_token` for building localized `/join/{token}` / ローカライズされた `/join/{token}` 用トークン */
  inviteToken: string;
};

/**
 * @param props - Created group identifiers / 作成済みグループの識別子
 */
export function PostCreateInviteCard({ groupId, inviteToken }: Props) {
  const locale = useLocale();
  const translations = useTranslations("GroupNew.postCreate");
  const origin = useSyncExternalStore(
    emptyOriginSubscribe,
    readWindowOriginSnapshot,
    () => "",
  );
  const joinPath = localizedJoinPath(locale, inviteToken);
  const inviteUrl = origin ? `${origin}${joinPath}` : "";
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function handleCopy() {
    setCopyError(null);
    setBusy(true);
    void navigator.clipboard
      .writeText(inviteUrl)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => {
        setCopyError(translations("copyError"));
      })
      .finally(() => setBusy(false));
  }

  const urlReady = inviteUrl.startsWith("http");

  return (
    <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20">
      <CardHeader>
        <CardTitle className="text-base">{translations("title")}</CardTitle>
        <CardDescription>{translations("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border bg-background px-3 py-2 font-mono text-xs break-all text-muted-foreground">
          {urlReady ? inviteUrl : translations("urlPending")}
        </div>
        {copyError ? (
          <p className="text-xs text-destructive" role="alert">
            {copyError}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-1.5"
            disabled={busy || !urlReady}
            onClick={handleCopy}
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : copied ? (
              <Check className="size-3.5 text-emerald-600" aria-hidden />
            ) : null}
            {copied ? translations("copied") : translations("copy")}
          </Button>
          <Link
            href={`/dashboard/groups/${groupId}`}
            className={cn(buttonVariants({ variant: "default", size: "sm" }))}
          >
            {translations("openGroup")}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
