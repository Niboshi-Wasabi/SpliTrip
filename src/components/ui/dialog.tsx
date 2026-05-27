"use client";

import * as React from "react";
import {
  Modal,
  useOverlayState,
  type UseOverlayStateReturn,
} from "@heroui/react";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const DialogStateContext = React.createContext<UseOverlayStateReturn | null>(null);

function useDialogState() {
  const state = React.useContext(DialogStateContext);
  if (!state) {
    throw new Error("Dialog compound components must be used within <Dialog>");
  }
  return state;
}

type DialogProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  children: React.ReactNode;
};

function Dialog({ open, defaultOpen, onOpenChange, children }: DialogProps) {
  const overlayState = useOverlayState({
    isOpen: open,
    defaultOpen,
    onOpenChange,
  });

  return (
    <DialogStateContext.Provider value={overlayState}>
      {children}
    </DialogStateContext.Provider>
  );
}

function DialogTrigger(props: React.ComponentProps<typeof Modal.Trigger>) {
  return <Modal.Trigger {...props} />;
}

function DialogPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function DialogClose(props: React.ComponentProps<typeof Modal.CloseTrigger>) {
  return <Modal.CloseTrigger {...props} />;
}

function DialogOverlay() {
  return null;
}

type DialogContentProps = {
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
};

function DialogContent({
  className,
  children,
  showCloseButton = true,
}: DialogContentProps) {
  const overlayState = useDialogState();

  if (!overlayState.isOpen) {
    return null;
  }

  return (
    <Modal state={overlayState}>
      <Modal.Backdrop className="bg-black/50 backdrop-blur-sm">
        <Modal.Container className="mx-4 w-full max-w-[calc(100%-2rem)] sm:max-w-lg">
          <Modal.Dialog
            data-slot="dialog-content"
            className={cn(
              "relative grid gap-4 rounded-[28px] border border-[var(--apple-separator)] bg-[var(--apple-card-bg)] p-4 text-sm text-[var(--apple-text)] shadow-xl outline-none",
              className,
            )}
          >
            {children}
            {showCloseButton ? (
              <Modal.CloseTrigger
                className="absolute top-2 right-2 inline-flex size-8 items-center justify-center rounded-lg text-[var(--apple-text-secondary)] transition hover:bg-[var(--apple-fill-tertiary)] hover:text-[var(--apple-text)]"
                aria-label="Close"
              >
                <XIcon className="size-4" />
              </Modal.CloseTrigger>
            ) : null}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

type DialogFooterProps = React.ComponentProps<"div"> & {
  showCloseButton?: boolean;
};

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: DialogFooterProps) {
  const overlayState = useDialogState();

  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-[28px] border-t border-[var(--apple-separator)] bg-[var(--apple-fill-tertiary)] p-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton ? (
        <Button variant="outline" onPress={() => overlayState.close()}>
          Close
        </Button>
      ) : null}
    </div>
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof Modal.Heading>) {
  return (
    <Modal.Heading
      data-slot="dialog-title"
      className={cn("font-heading text-base leading-none font-medium text-[var(--apple-text)]", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="dialog-description"
      className={cn("text-sm text-[var(--apple-text-secondary)]", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
