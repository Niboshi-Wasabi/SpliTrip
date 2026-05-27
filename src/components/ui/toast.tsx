"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within <ToastProvider>");
  }
  return context;
}

const TOAST_DURATION_MS = 4000;

const variantIcon: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />,
  error: <XCircle className="size-5 shrink-0 text-rose-500" />,
  info: <Info className="size-5 shrink-0 text-[var(--apple-link)]" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback((message: string, variant: ToastVariant = "info") => {
    const id = crypto.randomUUID();
    setToasts((previous) => [...previous, { id, message, variant }]);
    setTimeout(() => {
      setToasts((previous) => previous.filter((item) => item.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((previous) => previous.filter((item) => item.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-8"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-[var(--apple-separator)] bg-[var(--apple-card-bg)] px-4 py-3 shadow-lg backdrop-blur-xl",
              "animate-in slide-in-from-bottom-4 fade-in duration-300",
            )}
          >
            {variantIcon[item.variant]}
            <span className="flex-1 text-[15px] text-[var(--apple-text)]">
              {item.message}
            </span>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[var(--apple-text-secondary)] transition hover:bg-[var(--apple-fill-tertiary)]"
              aria-label="Dismiss"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
