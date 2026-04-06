/**
 * DOM → PNG export for group expense + settlement blocks using html2canvas.
 * html2canvas を用いたグループ出費・精算ブロックの PNG 書き出し。
 *
 * Why a dedicated module: keeps capture options, theme handling, and naming in one testable place.
 * 理由: キャプチャ設定・テーマ処理・命名を一箇所にまとめ、把握しやすくする。
 */

import html2canvas from "html2canvas";
import { sanitizeGroupNameForFilename } from "@/utils/exportCsv";

/**
 * Filename pattern: `[GroupName]_settlement_[YYYYMMDD].png`
 * ファイル名形式: `[GroupName]_settlement_[YYYYMMDD].png`
 *
 * Why: distinct suffix from CSV exports; date avoids overwriting prior screenshots.
 * 理由: CSV と接尾辞を分け、日付で上書きを防ぐ。
 */
export function buildExportPngFilename(
  groupName: string,
  exportedAt: Date,
): string {
  const y = exportedAt.getFullYear();
  const mo = String(exportedAt.getMonth() + 1).padStart(2, "0");
  const da = String(exportedAt.getDate()).padStart(2, "0");
  const segment = sanitizeGroupNameForFilename(groupName);
  return `${segment}_settlement_${y}${mo}${da}.png`;
}

/**
 * Wait two animation frames so CSS variables repaint after toggling `dark` on `<html>`.
 * `<html>` の `dark` 切り替え後、CSS 変数が再描画されるまで待つ。
 *
 * Why double rAF: one frame may not flush style/layout in all browsers before canvas read.
 * 理由: 1 フレームでは環境によってスタイル計算が終わっていないことがある。
 */
async function flushLayoutAfterThemeToggle(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/**
 * Run async work while forcing light tokens if the document root currently uses dark mode.
 * ルートがダークのときだけ一時的にライト相当の見た目にして非同期処理を実行する。
 *
 * Why: html2canvas reads computed styles; dark surfaces stay low-contrast on white letter paper.
 * 理由: html2canvas は計算済みスタイルを読むため、ダーク UI は白地画像でコントラストが落ちる。
 */

/**
 * OAuth 等のクロスオリジン画像は CORS なしだと canvas が taint し、toBlob が SecurityError になる。
 * クローン上では img を頭文字アバターに置き換え、確実に書き出し可能にする。
 * Cross-origin avatars taint the canvas; replace with initials in the clone so PNG export always succeeds.
 */
function firstGraphemeForExport(text: string): string {
  if (typeof Intl?.Segmenter === "function") {
    const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });
    const firstSegment = segmenter.segment(text)[Symbol.iterator]().next();
    return firstSegment.done ? "?" : firstSegment.value.segment;
  }
  return text.charAt(0) || "?";
}

function replaceAvatarImagesForPngCapture(
  clonedDocument: Document,
  clonedRoot: HTMLElement,
): void {
  const images = clonedRoot.querySelectorAll("img");
  images.forEach((node) => {
    const img = node;
    const altText = img.alt?.trim() || "?";
    const initial = firstGraphemeForExport(altText);

    const span = clonedDocument.createElement("span");
    span.textContent = initial;
    span.setAttribute("aria-hidden", "true");
    span.style.display = "inline-flex";
    span.style.alignItems = "center";
    span.style.justifyContent = "center";
    span.style.borderRadius = "9999px";
    span.style.backgroundColor = "#3b82f6";
    span.style.color = "#ffffff";
    span.style.fontWeight = "600";
    span.style.flexShrink = "0";

    const className = img.className || "";
    let sizePx = 24;
    if (className.includes("h-10") || className.includes("w-10")) sizePx = 40;
    else if (className.includes("h-8") || className.includes("w-8")) sizePx = 32;
    span.style.width = `${sizePx}px`;
    span.style.height = `${sizePx}px`;
    span.style.fontSize = sizePx <= 24 ? "10px" : "12px";

    img.replaceWith(span);
  });
}

async function withLightRootForCapture<T>(run: () => Promise<T>): Promise<T> {
  const root = document.documentElement;
  const hadDark = root.classList.contains("dark");
  if (!hadDark) {
    return run();
  }

  root.classList.remove("dark");
  try {
    await flushLayoutAfterThemeToggle();
    return await run();
  } finally {
    root.classList.add("dark");
    await flushLayoutAfterThemeToggle();
  }
}

/**
 * Serialize a canvas to a PNG `Blob` (lossless for UI screenshots).
 * キャンバスを PNG の Blob にする（UI スクショ向けの可逆圧縮）。
 *
 * Why Blob (not data URL): matches CSV download flow and avoids huge base64 strings in memory.
 * 理由: CSV ダウンロードと同じ Blob 経路に揃え、巨大な data URL を避ける。
 */
function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("PNG toBlob returned null"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

/**
 * Rasterize a DOM subtree to PNG bytes via html2canvas.
 * html2canvas で DOM サブツリーを PNG バイト列にする。
 *
 * Why `scale: 2`: sharper text on HiDPI shares without vector PDF complexity.
 * 理由: HiDPI で文字を粗くせず、ベクター PDF の複雑さは避ける。
 *
 * Why `ignoreElements`: payment buttons are irrelevant on a static share image.
 * 理由: 静的共有画像では送金ボタンは不要。
 */
export async function captureElementToPngBlob(
  element: HTMLElement,
): Promise<Blob> {
  return withLightRootForCapture(async () => {
    const canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      // クローン側で外部 img を差し替えたあとは汚染不要のため false（toBlob の SecurityError 回避）
      // After replacing foreign images in onclone, keep canvas untainted for toBlob().
      allowTaint: false,
      logging: false,
      onclone: (clonedDocument, clonedElement) => {
        replaceAvatarImagesForPngCapture(clonedDocument, clonedElement);
      },
      ignoreElements: (node) => {
        if (!(node instanceof HTMLElement)) {
          return false;
        }
        return node.dataset.splitripPngIgnore === "true";
      },
    });
    return canvasToPngBlob(canvas);
  });
}

/**
 * Trigger a PNG download from an existing Blob (object URL pattern).
 * 既存の Blob から PNG ダウンロードを開始する（オブジェクト URL 方式）。
 *
 * Why revoke URL: same leak-avoidance as CSV/text downloads.
 * 理由: CSV 等と同様にオブジェクト URL のリークを防ぐ。
 */
export function downloadPngBlob(filename: string, blob: Blob): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}

/**
 * Capture one element and immediately start download with the given filename.
 * 1 要素をキャプチャし、指定ファイル名で直ちにダウンロードする。
 *
 * Why one entry point: toolbar stays thin; errors surface to a single caller.
 * 理由: ツールバーを薄く保ち、エラーは呼び出し元に集約する。
 */
export async function downloadDomAsPng(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const blob = await captureElementToPngBlob(element);
  downloadPngBlob(filename, blob);
}
