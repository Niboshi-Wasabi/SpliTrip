/**
 * Travel report PDF: draw text on Canvas (CJK-friendly system fonts), embed in jsPDF.
 * html2canvas は廃止。ブラウザの Canvas で描画し、jpeg → jsPDF。
 *
 * Why canvas instead of jsPDF .text alone: default PDF fonts are weak for Japanese glyphs.
 * 理由: jsPDF 標準フォントは日本語が弱いため、ブラウザ字形を Canvas に載せる。
 */

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

const CSS_WIDTH = 720;
const PAD = 28;
const BODY_LINE = 22;
const SCALE = 2;

const BODY_FONT =
  'system-ui, "Segoe UI", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif';

function wrapLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let currentLine = "";
  for (const char of text) {
    const candidate = currentLine + char;
    if (context.measureText(candidate).width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = candidate;
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }
  return lines.length > 0 ? lines : [""];
}

function drawParagraph(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  let yCursor = y;
  for (const line of wrapLines(context, text, maxWidth)) {
    context.fillText(line, x, yCursor);
    yCursor += lineHeight;
  }
  return yCursor;
}

/**
 * Renders the report to a canvas tall enough for content (max ~12000px).
 * 内容に応じた高さの Canvas を生成する。
 */
function buildReportCanvas(options: BuildSimpleGroupPdfOptions): HTMLCanvasElement {
  const {
    groupName,
    currencyCode,
    locale,
    totalAmount,
    settlements,
    exportedAt,
    labels,
  } = options;

  const canvas = document.createElement("canvas");
  canvas.width = CSS_WIDTH * SCALE;
  canvas.height = 12000 * SCALE;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context unavailable");
  }

  context.scale(SCALE, SCALE);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, CSS_WIDTH, 12000);
  context.fillStyle = "#111827";

  const maxTextWidth = CSS_WIDTH - PAD * 2;
  let yPosition = PAD;

  context.font = `600 22px ${BODY_FONT}`;
  context.textBaseline = "top";
  yPosition = drawParagraph(
    context,
    labels.heading,
    PAD,
    yPosition,
    maxTextWidth,
    28,
  );
  yPosition += 8;

  context.font = `600 14px ${BODY_FONT}`;
  yPosition = drawParagraph(
    context,
    groupName,
    PAD,
    yPosition,
    maxTextWidth,
    BODY_LINE,
  );
  yPosition += 4;

  context.font = `12px ${BODY_FONT}`;
  context.fillStyle = "#6b7280";
  const printedReadable = exportedAt.toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  yPosition = drawParagraph(
    context,
    `${labels.printedAtLabel}: ${printedReadable}`,
    PAD,
    yPosition,
    maxTextWidth,
    18,
  );
  yPosition += 16;

  context.fillStyle = "#111827";
  context.font = `16px ${BODY_FONT}`;
  const totalLine = `${labels.totalLabel} ${formatMoneyByCurrency(
    currencyCode,
    totalAmount,
    locale,
  )}`;
  yPosition = drawParagraph(
    context,
    totalLine,
    PAD,
    yPosition,
    maxTextWidth,
    24,
  );
  yPosition += 16;

  context.font = `600 16px ${BODY_FONT}`;
  yPosition = drawParagraph(
    context,
    labels.settlementHeading,
    PAD,
    yPosition,
    maxTextWidth,
    22,
  );
  yPosition += 8;

  context.font = `14px ${BODY_FONT}`;
  if (settlements.length === 0) {
    context.fillStyle = "#6b7280";
    yPosition = drawParagraph(
      context,
      labels.settlementEmpty,
      PAD,
      yPosition,
      maxTextWidth,
      BODY_LINE,
    );
  } else {
    context.fillStyle = "#111827";
    for (const settlementRow of settlements) {
      const moneyText = formatMoneyByCurrency(
        currencyCode,
        settlementRow.amount,
        locale,
      );
      const line = `${settlementRow.fromDisplayName} → ${settlementRow.toDisplayName}: ${moneyText}`;
      yPosition = drawParagraph(
        context,
        line,
        PAD,
        yPosition,
        maxTextWidth,
        BODY_LINE,
      );
      yPosition += 4;
    }
  }

  const usedHeight = Math.min(12000, Math.ceil(yPosition + PAD));
  const trimmed = document.createElement("canvas");
  trimmed.width = CSS_WIDTH * SCALE;
  trimmed.height = usedHeight * SCALE;
  const trimmedContext = trimmed.getContext("2d");
  if (!trimmedContext) {
    throw new Error("Canvas 2D context unavailable");
  }
  trimmedContext.drawImage(canvas, 0, 0, CSS_WIDTH * SCALE, usedHeight * SCALE, 0, 0, CSS_WIDTH * SCALE, usedHeight * SCALE);
  return trimmed;
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
  const canvas = buildReportCanvas(options);
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
}
