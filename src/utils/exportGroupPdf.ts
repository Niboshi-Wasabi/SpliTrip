/**
 * Simple “travel report” PDF: rasterize a lightweight DOM via html2canvas, embed in jsPDF.
 * 旅行サマリ PDF: 小さな DOM を html2canvas で画像化し jsPDF に埋め込む。
 *
 * Why canvas+jsPDF: native jsPDF fonts poorly support CJK; rendering HTML preserves glyphs.
 * 理由: jsPDF の標準フォントは CJK が弱い。HTML 経由ならブラウザの字形を活かせる。
 */

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { formatMoneyByCurrency } from "@/lib/currency-payment-amount";
import { sanitizeGroupNameForFilename } from "@/utils/exportCsv";

export type PdfSettlementLineInput = {
  fromDisplayName: string;
  toDisplayName: string;
  amount: number;
};

export type GroupPdfSimpleLabels = {
  heading: string;
  totalLabel: string;
  settlementHeading: string;
  settlementEmpty: string;
  printedAtLabel: string;
};

export type BuildSimpleGroupPdfOptions = {
  groupName: string;
  currencyCode: string;
  locale: string;
  totalAmount: number;
  settlements: PdfSettlementLineInput[];
  exportedAt: Date;
  labels: GroupPdfSimpleLabels;
};

async function waitTwoAnimationFrames(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

async function withLightDocumentRoot<T>(run: () => Promise<T>): Promise<T> {
  const htmlRoot = document.documentElement;
  const hadDarkClass = htmlRoot.classList.contains("dark");
  if (!hadDarkClass) {
    return run();
  }
  htmlRoot.classList.remove("dark");
  try {
    await waitTwoAnimationFrames();
    return await run();
  } finally {
    htmlRoot.classList.add("dark");
    await waitTwoAnimationFrames();
  }
}

function buildReportHostElement(
  options: BuildSimpleGroupPdfOptions,
): HTMLDivElement {
  const {
    groupName,
    currencyCode,
    locale,
    totalAmount,
    settlements,
    exportedAt,
    labels,
  } = options;

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-12000px";
  host.style.top = "0";
  host.style.width = "720px";
  host.style.padding = "28px";
  host.style.background = "#ffffff";
  host.style.color = "#111827";
  host.style.fontFamily =
    'system-ui, "Segoe UI", "Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif';
  host.style.fontSize = "14px";
  host.style.lineHeight = "1.5";

  const titleElement = document.createElement("h1");
  titleElement.style.margin = "0 0 8px";
  titleElement.style.fontSize = "22px";
  titleElement.textContent = labels.heading;
  host.appendChild(titleElement);

  const nameElement = document.createElement("p");
  nameElement.style.margin = "0 0 4px";
  nameElement.style.fontWeight = "600";
  nameElement.textContent = groupName;
  host.appendChild(nameElement);

  const printedElement = document.createElement("p");
  printedElement.style.margin = "0 0 20px";
  printedElement.style.fontSize = "12px";
  printedElement.style.color = "#6b7280";
  const printedReadable = exportedAt.toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  printedElement.textContent = `${labels.printedAtLabel}: ${printedReadable}`;
  host.appendChild(printedElement);

  const totalElement = document.createElement("p");
  totalElement.style.margin = "0 0 16px";
  totalElement.style.fontSize = "16px";
  totalElement.innerHTML = `<strong>${labels.totalLabel}</strong> ${formatMoneyByCurrency(
    currencyCode,
    totalAmount,
    locale,
  )}`;
  host.appendChild(totalElement);

  const settlementTitleElement = document.createElement("h2");
  settlementTitleElement.style.margin = "0 0 8px";
  settlementTitleElement.style.fontSize = "16px";
  settlementTitleElement.textContent = labels.settlementHeading;
  host.appendChild(settlementTitleElement);

  if (settlements.length === 0) {
    const emptyElement = document.createElement("p");
    emptyElement.style.margin = "0";
    emptyElement.style.color = "#6b7280";
    emptyElement.textContent = labels.settlementEmpty;
    host.appendChild(emptyElement);
  } else {
    const listElement = document.createElement("ul");
    listElement.style.margin = "0";
    listElement.style.paddingLeft = "20px";
    for (const settlementRow of settlements) {
      const listItem = document.createElement("li");
      listItem.style.marginBottom = "6px";
      const moneyText = formatMoneyByCurrency(
        currencyCode,
        settlementRow.amount,
        locale,
      );
      listItem.textContent = `${settlementRow.fromDisplayName} → ${settlementRow.toDisplayName}: ${moneyText}`;
      listElement.appendChild(listItem);
    }
    host.appendChild(listElement);
  }

  return host;
}

export function buildExportPdfFilename(
  groupName: string,
  exportedAt: Date,
): string {
  const year = exportedAt.getFullYear();
  const month = String(exportedAt.getMonth() + 1).padStart(2, "0");
  const day = String(exportedAt.getDate()).padStart(2, "0");
  const segment = sanitizeGroupNameForFilename(groupName);
  return `${segment}_report_${year}${month}${day}.pdf`;
}

/**
 * Build a portrait A4 PDF and trigger download in the browser.
 * 縦向き A4 の PDF を生成し、ブラウザでダウンロードする。
 */
export async function downloadSimpleGroupPdf(
  options: BuildSimpleGroupPdfOptions,
  filename: string,
): Promise<void> {
  await withLightDocumentRoot(async () => {
    const host = buildReportHostElement(options);
    document.body.appendChild(host);
    try {
      const canvas = await html2canvas(host, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const imageDataUrl = canvas.toDataURL("image/jpeg", 0.92);
      const pdfDocument = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageWidthMillimeters = pdfDocument.internal.pageSize.getWidth();
      const pageHeightMillimeters = pdfDocument.internal.pageSize.getHeight();

      const imageWidthMillimeters = pageWidthMillimeters;
      const imageHeightMillimeters =
        (canvas.height * imageWidthMillimeters) / canvas.width;
      let verticalOffsetMillimeters = 0;
      let remainingHeight = imageHeightMillimeters;

      pdfDocument.addImage(
        imageDataUrl,
        "JPEG",
        0,
        verticalOffsetMillimeters,
        imageWidthMillimeters,
        imageHeightMillimeters,
      );
      remainingHeight -= pageHeightMillimeters;

      while (remainingHeight > 0) {
        verticalOffsetMillimeters = -(imageHeightMillimeters - remainingHeight);
        pdfDocument.addPage();
        pdfDocument.addImage(
          imageDataUrl,
          "JPEG",
          0,
          verticalOffsetMillimeters,
          imageWidthMillimeters,
          imageHeightMillimeters,
        );
        remainingHeight -= pageHeightMillimeters;
      }

      pdfDocument.save(filename);
    } finally {
      document.body.removeChild(host);
    }
  });
}
