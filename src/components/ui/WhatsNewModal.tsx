"use client";

import { useEffect, useMemo, useState } from "react";
import { Gift, PartyPopper, Rocket, Sparkles } from "lucide-react";
import {
  APP_CHANGELOG_ENTRIES,
  APP_CHANGELOG_VERSION,
  type ChangelogEntry,
} from "@/config/changelog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const LAST_SEEN_UPDATE_VERSION_KEY = "lastSeenUpdateVersion";

function getChangelogIcon(iconName: ChangelogEntry["iconName"]) {
  if (iconName === "gift") {
    return Gift;
  }
  if (iconName === "rocket") {
    return Rocket;
  }
  return Sparkles;
}

export function WhatsNewModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const lastSeenVersion = localStorage.getItem(LAST_SEEN_UPDATE_VERSION_KEY);
      const shouldOpen = lastSeenVersion !== APP_CHANGELOG_VERSION;
      setIsOpen(shouldOpen);
      setHasCheckedStorage(true);
    });
  }, []);

  const changelogEntries = useMemo(() => APP_CHANGELOG_ENTRIES, []);

  function handleGotItClick() {
    localStorage.setItem(LAST_SEEN_UPDATE_VERSION_KEY, APP_CHANGELOG_VERSION);
    setIsOpen(false);
  }

  if (!hasCheckedStorage) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
              <PartyPopper className="h-5 w-5" aria-hidden />
            </span>
            <DialogTitle className="text-left text-base leading-snug">
              What&apos;s New - 新機能のお知らせ
            </DialogTitle>
          </div>
          <DialogDescription className="text-left text-sm">
            最新バージョン {APP_CHANGELOG_VERSION} の更新内容です。
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3 rounded-lg border border-border bg-muted/30 p-3 text-sm">
          {changelogEntries.map((changelogEntry) => {
            const EntryIcon = getChangelogIcon(changelogEntry.iconName);
            return (
              <li key={changelogEntry.title} className="flex gap-2">
                <EntryIcon
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-hidden
                />
                <div className="space-y-0.5">
                  <p className="font-medium leading-snug text-foreground">
                    {changelogEntry.title}
                  </p>
                  <p className="leading-snug text-muted-foreground">
                    {changelogEntry.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        <Button
          type="button"
          className="min-h-[44px] w-full md:min-h-10"
          onClick={handleGotItClick}
        >
          確認しました (Got it!)
        </Button>
      </DialogContent>
    </Dialog>
  );
}
