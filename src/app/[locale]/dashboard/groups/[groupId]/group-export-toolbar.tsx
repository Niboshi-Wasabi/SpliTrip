"use client";

/**
 * CSV / print / PDF report for the group detail view. CSV & PDF report are PRO-gated.
 * グループ詳細の CSV・印刷・PDF。CSV と PDF レポートは PRO のみ。
 */

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, FileText, Lock, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseExpenseCategoryId } from "@/lib/expense-categories";
import {
  buildExportCsvFilename,
  buildGroupExportCsv,
  downloadCsvFile,
  type CsvExpenseInput,
  type CsvMember,
  type CsvSettlementInput,
  type GroupExportCsvLabels,
} from "@/utils/exportCsv";
import { useUpgradeModal } from "@/components/premium/upgrade-modal-context";
import {
  buildExportPdfFilename,
  downloadSimpleGroupPdf,
  type PdfSettlementLineInput,
} from "@/utils/exportGroupPdf";

type Props = {
  groupName: string;
  currencyCode: string;
  members: CsvMember[];
  expenses: CsvExpenseInput[];
  settlements: CsvSettlementInput[];
  totalExpenseAmount: number;
  printedAtLabel: string;
};

function useGroupExportCsvLabels(): GroupExportCsvLabels {
  const translations = useTranslations("GroupExport");
  return {
    metaGroup: translations("csvMetaGroup"),
    metaCurrency: translations("csvMetaCurrency"),
    metaExported: translations("csvMetaExported"),
    sectionExpenses: translations("csvSectionExpenses"),
    colDate: translations("csvColDate"),
    colPayer: translations("csvColPayer"),
    colCategory: translations("csvColCategory"),
    colDescription: translations("csvColDescription"),
    colAmount: translations("csvColAmount"),
    colSplits: translations("csvColSplits"),
    sectionSettlements: translations("csvSectionSettlements"),
    colFrom: translations("csvColFrom"),
    colTo: translations("csvColTo"),
    colSettlementAmount: translations("csvColSettlementAmount"),
    noSettlementsRow: translations("csvNoSettlementsRow"),
  };
}

export function GroupExportToolbar({
  groupName,
  currencyCode,
  members,
  expenses,
  settlements,
  totalExpenseAmount,
  printedAtLabel,
}: Props) {
  const translations = useTranslations("GroupExport");
  const categoryTranslations = useTranslations("ExpenseCategory");
  const locale = useLocale();
  const csvLabels = useGroupExportCsvLabels();
  const { hasPremiumAccess, openUpgradeModal } = useUpgradeModal();
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  function handleExportCsv(): void {
    if (!hasPremiumAccess) {
      openUpgradeModal();
      return;
    }
    const exportedAt = new Date();
    const expensesForCsv: CsvExpenseInput[] = expenses.map((expenseRow) => ({
      ...expenseRow,
      categoryLabel: categoryTranslations(
        parseExpenseCategoryId(expenseRow.category),
      ),
    }));
    const csvBody = buildGroupExportCsv({
      groupName,
      currencyCode,
      exportedAt,
      locale,
      expenses: expensesForCsv,
      settlements,
      members,
      labels: csvLabels,
    });
    const filename = buildExportCsvFilename(groupName, exportedAt);
    downloadCsvFile(filename, csvBody);
  }

  function handlePrint(): void {
    window.print();
  }

  async function handleExportPdfReport(): Promise<void> {
    if (!hasPremiumAccess) {
      openUpgradeModal();
      return;
    }
    setPdfBusy(true);
    setPdfError(null);
    try {
      const exportedAt = new Date();
      const settlementLines: PdfSettlementLineInput[] = settlements.map(
        (settlementRow) => ({
          fromDisplayName: settlementRow.fromDisplayName,
          toDisplayName: settlementRow.toDisplayName,
          amount: settlementRow.amount,
        }),
      );
      await downloadSimpleGroupPdf(
        {
          groupName,
          currencyCode,
          locale,
          totalAmount: totalExpenseAmount,
          settlements: settlementLines,
          exportedAt,
          labels: {
            heading: translations("pdfReportHeading"),
            totalLabel: translations("pdfTotalSpendLabel"),
            settlementHeading: translations("pdfSettlementHeading"),
            settlementEmpty: translations("pdfSettlementEmpty"),
            printedAtLabel: translations("printedAt"),
          },
        },
        buildExportPdfFilename(groupName, exportedAt),
      );
    } catch (caughtError) {
      console.error("handleExportPdfReport:", caughtError);
      setPdfError(translations("pdfExportError"));
    } finally {
      setPdfBusy(false);
    }
  }

  function onCsvClick(): void {
    handleExportCsv();
  }

  function onPdfClick(): void {
    void handleExportPdfReport();
  }

  return (
    <>
      <div className="mb-6 hidden print:block">
        <h1 className="text-2xl font-bold text-[var(--apple-text)]">{groupName}</h1>
        <p className="text-sm text-[var(--apple-text-secondary)]">
          {translations("printedAt")}: {printedAtLabel}
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-2 print:hidden">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={onCsvClick}
          >
            <Download className="size-4 shrink-0" aria-hidden />
            {translations("exportCsv")}
            {!hasPremiumAccess ? (
              <Lock className="size-3.5 shrink-0 opacity-70" aria-hidden />
            ) : null}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handlePrint}
          >
            <Printer className="size-4 shrink-0" aria-hidden />
            {translations("exportPdfPrint")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={pdfBusy}
            onClick={onPdfClick}
          >
            <FileText className="size-4 shrink-0" aria-hidden />
            {pdfBusy
              ? translations("pdfExporting")
              : translations("exportPdfReport")}
            {!hasPremiumAccess ? (
              <Lock className="size-3.5 shrink-0 opacity-70" aria-hidden />
            ) : null}
          </Button>
        </div>
        {pdfError ? (
          <p className="text-sm text-red-500" role="alert">
            {pdfError}
          </p>
        ) : null}
      </div>
    </>
  );
}
