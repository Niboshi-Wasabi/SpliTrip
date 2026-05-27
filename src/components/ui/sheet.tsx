"use client";

import * as React from "react";
import {
  Modal,
  useOverlayState,
  type UseOverlayStateReturn,
} from "@heroui/react";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const SheetStateContext = React.createContext<UseOverlayStateReturn | null>(null);

function useSheetState() {
  const state = React.useContext(SheetStateContext);
  if (!state) {
    throw new Error("Sheet compound components must be used within <Sheet>");
  }
  return state;
}

type SheetProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  children: React.ReactNode;
};

function Sheet({ open, defaultOpen, onOpenChange, children }: SheetProps) {
  const overlayState = useOverlayState({
    isOpen: open,
    defaultOpen,
    onOpenChange,
  });

  return (
    <SheetStateContext.Provider value={overlayState}>
      {children}
    </SheetStateContext.Provider>
  );
}

function SheetTrigger(props: React.ComponentProps<typeof Modal.Trigger>) {
  return <Modal.Trigger {...props} />;
}

function SheetClose(props: React.ComponentProps<typeof Modal.CloseTrigger>) {
  return <Modal.CloseTrigger {...props} />;
}

type SheetContentProps = {
  children: React.ReactNode;
  className?: string;
  side?: "bottom" | "right";
};

function SheetContent({
  className,
  children,
  side = "bottom",
}: SheetContentProps) {
  const overlayState = useSheetState();

  if (!overlayState.isOpen) {
    return null;
  }

  const positionClasses =
    side === "right"
      ? "ml-auto h-full w-full max-w-md rounded-l-[28px] rounded-r-none"
      : "mt-auto w-full max-h-[85dvh] rounded-t-[28px] rounded-b-none";

  return (
    <Modal state={overlayState}>
      <Modal.Backdrop className="bg-black/40 backdrop-blur-sm">
        <Modal.Container
          className={cn(
            "flex min-h-dvh",
            side === "right" ? "items-stretch justify-end" : "items-end justify-center",
          )}
        >
          <Modal.Dialog
            className={cn(
              "relative overflow-hidden border border-[var(--apple-separator)] bg-[var(--apple-card-bg)] shadow-xl outline-none",
              positionClasses,
              className,
            )}
          >
            <div className="flex h-full flex-col overflow-y-auto">
              {children}
            </div>
            <Modal.CloseTrigger
              className="absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-full bg-[var(--apple-fill-tertiary)] text-[var(--apple-text-secondary)] transition hover:text-[var(--apple-text)]"
              aria-label="Close"
            >
              <XIcon className="size-4" />
            </Modal.CloseTrigger>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 border-b border-[var(--apple-separator)] px-4 py-4",
        className,
      )}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof Modal.Heading>) {
  return (
    <Modal.Heading
      className={cn("text-[17px] font-semibold text-[var(--apple-text)]", className)}
      {...props}
    />
  );
}

function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex-1 overflow-y-auto px-4 py-4", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  useSheetState,
};
