"use client";

/**
 * CSV / print-PDF / PNG export entry points for the group detail view.
 * グループ詳細の CSV・印刷（PDF 相当）・PNG のエクスポート入口。
 */

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, ImageIcon, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildExportCsvFilename,
  buildGroupExportCsv,
  downloadCsvFile,
  type CsvExpenseInput,
  type CsvMember,
  type CsvSettlementInput,
  type GroupExportCsvLabels,
} from "@/utils/exportCsv";
import {
  buildExportPngFilename,
  downloadDomAsPng,
} from "@/utils/exportGroupPng";
import { useGroupExportCaptureRef } from "./group-export-capture";

type Props = {
  groupName: string;
  currencyCode: string;
  members: CsvMember[];
  expenses: CsvExpenseInput[];
  settlements: CsvSettlementInput[];
};

/**
 * Build label bag for CSV headers from next-intl strings.
 * next-intl の文字列から CSV 見出し用ラベル集合を組み立てる。
 *
 * Why: CSV column titles must follow UI language; isolates all `GroupExport` keys in one place.
 * 理由: CSV 見出しを UI 言語に合わせ、`GroupExport` キーを一箇所に集約する。
 */
function useGroupExportCsvLabels(): GroupExportCsvLabels {
  const t = useTranslations("GroupExport");
  return {
    metaGroup: t("csvMetaGroup"),
    metaCurrency: t("csvMetaCurrency"),
    metaExported: t("csvMetaExported"),
    sectionExpenses: t("csvSectionExpenses"),
    colDate: t("csvColDate"),
    colPayer: t("csvColPayer"),
    colDescription: t("csvColDescription"),
    colAmount: t("csvColAmount"),
    colSplits: t("csvColSplits"),
    sectionSettlements: t("csvSectionSettlements"),
    colFrom: t("csvColFrom"),
    colTo: t("csvColTo"),
    colSettlementAmount: t("csvColSettlementAmount"),
    noSettlementsRow: t("csvNoSettlementsRow"),
  };
}

/**
 * Renders export actions and a print-only title block for the group page.
 * グループページのエクスポート操作と、印刷時のみのタイトルブロックを描画する。
 *
 * Why client component: CSV / PNG / `window.print` require the browser runtime.
 * 理由: CSV・PNG・`window.print` はブラウザ実行時が必要。
 */
export function GroupExportToolbar({
  groupName,
  currencyCode,
  members,
  expenses,
  settlements,
}: Props) {
  const t = useTranslations("GroupExport");
  const locale = useLocale();
  const csvLabels = useGroupExportCsvLabels();
  const captureRef = useGroupExportCaptureRef();
  const [pngBusy, setPngBusy] = useState(false);
  const [pngError, setPngError] = useState<string | null>(null);

  /**
   * Serialize current props into a BOM CSV and trigger download.
   * 現在の画面データを BOM 付き CSV にし、ダウンロードを開始する。
   *
   * Why client-only: needs `document` / Blob URL; keeps RSC payload small.
   * 理由: `document` と Blob URL が必要。RSC のペイロードを小さく保つ。
   */
  function handleExportCsv(): void {
    const exportedAt = new Date();
    const csvBody = buildGroupExportCsv({
      groupName,
      currencyCode,
      exportedAt,
      locale,
      expenses,
      settlements,
      members,
      labels: csvLabels,
    });
    const filename = buildExportCsvFilename(groupName, exportedAt);
    downloadCsvFile(filename, csvBody);
  }

  /**
   * Open the browser print dialog so the user can save as PDF.
   * ブラウザの印刷ダイアログを開き、PDF 保存に任せる。
   *
   * Why `window.print`: avoids heavy PDF libs and keeps CJK rendering native.
   * 理由: 重い PDF ライブラリを避け、CJK はブラウザ描画に任せる。
   */
  function handlePrint(): void {
    window.print();
  }

  /**
   * Rasterize the shared capture region and save PNG (light styling while dark is active).
   * 共有キャプチャ領域をラスタ化して PNG 保存する（ダーク時は一時的にライト見た目）。
   *
   * Why async: html2canvas returns a Promise; we gate the button to prevent double clicks.
   * 理由: html2canvas は Promise のため、連打防止にボタンを制御する。
   */
  async function handleExportPng(): Promise<void> {
    const rootEl = captureRef.current;
    if (!rootEl) {
      setPngError(t("pngExportMissingTarget"));
      return;
    }

    setPngBusy(true);
    setPngError(null);
    try {
      const exportedAt = new Date();
      const filename = buildExportPngFilename(groupName, exportedAt);
      await downloadDomAsPng(rootEl, filename);
    } catch (err) {
      console.error("handleExportPng:", err);
      setPngError(t("pngExportError"));
    } finally {
      setPngBusy(false);
    }
  }

  const printedAtLabel = new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());

  return (
    <>
      <div className="mb-6 hidden print:block">
        <h1 className="text-2xl font-bold text-foreground">{groupName}</h1>
        <p className="text-sm text-muted-foreground">
          {t("printedAt")}: {printedAtLabel}
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-2 print:hidden">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExportCsv}
          >
            <Download className="size-4 shrink-0" aria-hidden />
            {t("exportCsv")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handlePrint}
          >
            <Printer className="size-4 shrink-0" aria-hidden />
            {t("exportPdfPrint")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={pngBusy}
            onClick={() => {
              void handleExportPng();
            }}
          >
            <ImageIcon className="size-4 shrink-0" aria-hidden />
            {pngBusy ? t("pngExporting") : t("exportPngImage")}
          </Button>
        </div>
        {pngError ? (
          <p className="text-sm text-destructive" role="alert">
            {pngError}
          </p>
        ) : null}
      </div>
    </>
  );
}
