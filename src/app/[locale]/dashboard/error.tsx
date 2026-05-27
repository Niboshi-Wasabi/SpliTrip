"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const dashboardErrorTranslations = useTranslations("DashboardError");

  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 pt-8 text-center">
          <div className="rounded-full bg-rose-500/10 p-3">
            <AlertCircle className="size-8 text-rose-500" />
          </div>
          <h2 className="text-xl font-semibold">
            {dashboardErrorTranslations("title")}
          </h2>
          <p className="text-sm text-[var(--apple-text-secondary)]">
            {dashboardErrorTranslations("description")}
          </p>
          {process.env.NODE_ENV !== "production" || error?.message ? (
            <details className="mt-2 w-full text-left text-xs text-[var(--apple-text-secondary)]">
              <summary className="cursor-pointer">
                {dashboardErrorTranslations("detailsLabel")}
              </summary>
              <pre className="mt-1 overflow-auto rounded bg-[var(--apple-fill-tertiary)] p-2">
                {error?.message ?? dashboardErrorTranslations("unknownError")}
                {error?.digest ? `\ndigest: ${error.digest}` : ""}
              </pre>
            </details>
          ) : null}
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {dashboardErrorTranslations("retry")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
