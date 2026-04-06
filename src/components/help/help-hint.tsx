"use client";

/**
 * Tap-friendly help: opens a short explanation in a dialog (no extra tooltip dependency).
 * 「?」タップで説明ダイアログ。専門用語を避けた本文は next-intl 側で渡す。
 */

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type HelpHintProps = {
  /** Accessible label for the trigger (e.g. aria-label from i18n). */
  ariaLabel: string;
  /** Dialog title */
  title: string;
  /** Plain-language body (already translated). */
  body: string;
};

export function HelpHint({ ariaLabel, title, body }: HelpHintProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0 text-muted-foreground"
        aria-label={ariaLabel}
        onClick={() => setDialogOpen(true)}
      >
        <HelpCircle className="h-4 w-4" aria-hidden />
      </Button>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
