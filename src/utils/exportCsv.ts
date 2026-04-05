/**
 * Build downloadable CSV for group expenses + simplified settlements (UTF-8 BOM for Excel).
 * グループ出費と精算行の CSV 文字列を組み立てる（Excel 向け UTF-8 BOM）。
 *
 * Why no third-party CSV libs: fields are bounded and escaping rules are small; keeps bundle lean.
 * 理由: 列は限定的でエスケープ規則が単純なため、依存を増やさない。
 */

import {
  formatMoneyByCurrency,
  isZeroDecimalCurrency,
} from "@/lib/currency-payment-amount";

/** Excel-friendly UTF-8 BOM so Japanese opens correctly on Windows. / Windows 版 Excel が UTF-8 と判別する BOM */
const UTF8_BOM = "\uFEFF";

/** Line break Excel expects in many locales. / Excel が扱いやすい改行 */
const CSV_NEWLINE = "\r\n";

/** Max length for the group segment in filenames (OS limits). / ファイル名用グループ名の最大長 */
const MAX_FILENAME_GROUP_SEGMENT_LENGTH = 60;

/** Characters unsafe in Windows/macOS filenames. / ファイル名に使えない文字 */
const FILENAME_FORBIDDEN = /[\\/:*?"<>|]/g;

export type GroupExportCsvLabels = {
  metaGroup: string;
  metaCurrency: string;
  metaExported: string;
  sectionExpenses: string;
  colDate: string;
  colPayer: string;
  colDescription: string;
  colAmount: string;
  colSplits: string;
  sectionSettlements: string;
  colFrom: string;
  colTo: string;
  colSettlementAmount: string;
  /** Shown when there are zero settlement transfers. / 精算行が 0 件のとき */
  noSettlementsRow: string;
};

export type CsvMember = {
  user_id: string;
  display_name: string;
};

export type CsvExpenseInput = {
  expense_date: string;
  payer_id: string;
  description: string | null;
  amount: number;
  expense_splits: { user_id: string; amount: number }[] | null;
};

export type CsvSettlementInput = {
  fromDisplayName: string;
  toDisplayName: string;
  amount: number;
};

export type BuildGroupExportCsvOptions = {
  groupName: string;
  currencyCode: string;
  exportedAt: Date;
  locale: string;
  expenses: CsvExpenseInput[];
  settlements: CsvSettlementInput[];
  members: CsvMember[];
  labels: GroupExportCsvLabels;
};

/**
 * Escape one CSV field per RFC-style quoting when needed.
 * 必要なら RFC 風のダブルクォートで 1 フィールドをエスケープする。
 *
 * Why: commas/newlines/quotes in descriptions would break column alignment without quoting.
 * 理由: 内容にカンマ・改行・引用符があると、クォート無しでは列がずれる。
 */
export function escapeCsvField(raw: string): string {
  if (/[",\r\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

/**
 * Build a row from string cells (already escaped or safe literals).
 * 文字列セルから 1 行を組み立てる。
 *
 * Why: centralizes the comma delimiter so we never mix separators by mistake.
 * 理由: 区切りカンマを一箇所にまとめ、誤った区切りを防ぐ。
 */
function csvRow(cells: string[]): string {
  return cells.join(",");
}

/**
 * Resolve display name for a user id with early return when members are missing.
 * メンバー一覧から表示名を解決する（無ければ ID を返す）。
 *
 * Why: stable fallback keeps CSV useful even if membership rows are stale.
 * 理由: メンバー行が欠けても CSV に最低限の識別子を残す。
 */
function displayNameForUserId(
  members: CsvMember[],
  userId: string,
): string {
  const found = members.find((memberRow) => memberRow.user_id === userId);
  if (!found) {
    return userId;
  }
  return found.display_name;
}

/**
 * Numeric amount string for the Amount column (Excel-friendly, no currency symbol).
 * 金額列用の数値文字列（通貨記号なしで Excel に取り込みやすい）。
 *
 * Why: Excel parses plain numbers for SUM charts; symbols would force text cells.
 * 理由: Excel が数値として合計しやすく、記号付きだと文字列扱いになりがち。
 */
function amountNumericForCsv(currencyCode: string, amount: number): string {
  if (!Number.isFinite(amount)) {
    return "0";
  }
  const code = currencyCode.trim().toUpperCase();
  if (isZeroDecimalCurrency(code)) {
    return String(Math.round(amount));
  }
  return (Math.round(amount * 100) / 100).toFixed(2);
}

/**
 * Human-readable split breakdown for one expense row.
 * 1 件の出費について按分内訳の可読文字列を作る。
 *
 * Why: one CSV column keeps the file rectangular; multi-column splits explode width.
 * 理由: 列を増やさず 1 列にまとめ、列数爆発と空セルを避ける。
 */
function buildSplitsSummaryCsv(
  locale: string,
  currencyCode: string,
  members: CsvMember[],
  splits: { user_id: string; amount: number }[] | null,
): string {
  if (!splits || splits.length === 0) {
    return "";
  }
  const parts: string[] = [];
  for (const splitRow of splits) {
    const name = displayNameForUserId(members, splitRow.user_id);
    const money = formatMoneyByCurrency(
      currencyCode,
      splitRow.amount,
      locale,
    );
    parts.push(`${name}: ${money}`);
  }
  return parts.join("; ");
}

/**
 * Sanitize group title for use inside a filename segment.
 * ファイル名の一部として使えるようグループ名を整形する。
 *
 * Why: OS-forbidden characters and long names break downloads or user filesystems.
 * 理由: 禁止文字や長すぎる名前で保存やダウンロードが失敗しうる。
 */
export function sanitizeGroupNameForFilename(rawName: string): string {
  const trimmed = rawName.trim();
  if (trimmed.length === 0) {
    return "group";
  }
  const withoutIllegal = trimmed
    .replace(FILENAME_FORBIDDEN, "_")
    .replace(/\s+/g, " ")
    .slice(0, MAX_FILENAME_GROUP_SEGMENT_LENGTH);
  return withoutIllegal.length > 0 ? withoutIllegal : "group";
}

/**
 * Filename pattern: `[GroupName]_expenses_[YYYYMMDD].csv`
 * ファイル名形式: `[GroupName]_expenses_[YYYYMMDD].csv`
 *
 * Why: dated filenames avoid overwriting prior exports when reconciling trips.
 * 理由: 日付付きで上書きを避け、旅行ごとの比較がしやすい。
 */
export function buildExportCsvFilename(
  groupName: string,
  exportedAt: Date,
): string {
  const y = exportedAt.getFullYear();
  const mo = String(exportedAt.getMonth() + 1).padStart(2, "0");
  const da = String(exportedAt.getDate()).padStart(2, "0");
  const segment = sanitizeGroupNameForFilename(groupName);
  return `${segment}_expenses_${y}${mo}${da}.csv`;
}

/**
 * Compose the full CSV document with BOM, metadata, expenses, and settlements.
 * メタデータ・出費・精算を含む CSV 全文（BOM 付き）を返す。
 *
 * Why: BOM + labeled sections match the product spec and Excel UTF-8 detection.
 * 理由: BOM とセクション見出しで仕様どおりかつ Excel の UTF-8 判定に合わせる。
 */
export function buildGroupExportCsv(options: BuildGroupExportCsvOptions): string {
  const {
    groupName,
    currencyCode,
    exportedAt,
    locale,
    expenses,
    settlements,
    members,
    labels,
  } = options;

  const exportedLabel = exportedAt.toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const lines: string[] = [];

  lines.push(
    csvRow([
      escapeCsvField(labels.metaGroup),
      escapeCsvField(groupName),
    ]),
  );
  lines.push(
    csvRow([
      escapeCsvField(labels.metaCurrency),
      escapeCsvField(currencyCode.trim().toUpperCase()),
    ]),
  );
  lines.push(
    csvRow([
      escapeCsvField(labels.metaExported),
      escapeCsvField(exportedLabel),
    ]),
  );
  lines.push("");
  lines.push(escapeCsvField(labels.sectionExpenses));
  lines.push(
    csvRow([
      escapeCsvField(labels.colDate),
      escapeCsvField(labels.colPayer),
      escapeCsvField(labels.colDescription),
      escapeCsvField(labels.colAmount),
      escapeCsvField(labels.colSplits),
    ]),
  );

  for (const expenseRow of expenses) {
    const payerName = displayNameForUserId(members, expenseRow.payer_id);
    const description =
      expenseRow.description?.trim() !== ""
        ? (expenseRow.description ?? "").trim()
        : "—";
    const splitsText = buildSplitsSummaryCsv(
      locale,
      currencyCode,
      members,
      expenseRow.expense_splits,
    );
    lines.push(
      csvRow([
        escapeCsvField(expenseRow.expense_date),
        escapeCsvField(payerName),
        escapeCsvField(description),
        escapeCsvField(
          amountNumericForCsv(currencyCode, expenseRow.amount),
        ),
        escapeCsvField(splitsText),
      ]),
    );
  }

  lines.push("");
  lines.push(escapeCsvField(labels.sectionSettlements));
  lines.push(
    csvRow([
      escapeCsvField(labels.colFrom),
      escapeCsvField(labels.colTo),
      escapeCsvField(labels.colSettlementAmount),
    ]),
  );

  if (settlements.length === 0) {
    lines.push(
      csvRow([
        escapeCsvField(labels.noSettlementsRow),
        "",
        "",
      ]),
    );
  } else {
    for (const settlementRow of settlements) {
      lines.push(
        csvRow([
          escapeCsvField(settlementRow.fromDisplayName),
          escapeCsvField(settlementRow.toDisplayName),
          escapeCsvField(
            amountNumericForCsv(currencyCode, settlementRow.amount),
          ),
        ]),
      );
    }
  }

  return UTF8_BOM + lines.join(CSV_NEWLINE);
}

/**
 * Trigger a browser download using Blob + object URL (no extra dependencies).
 * Blob とオブジェクト URL でダウンロードを開始する（追加依存なし）。
 *
 * Why revoke URL: avoids leaking object URLs on long sessions.
 * 理由: オブジェクト URL のリークを防ぐ。
 */
export function downloadTextFile(
  filename: string,
  content: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
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
 * Download UTF-8 CSV with BOM.
 * BOM 付き UTF-8 CSV として保存する。
 *
 * Why: wraps `downloadTextFile` with the correct MIME for CSV consumers.
 * 理由: CSV 向け MIME を固定し、ブラウザと Excel の扱いを揃える。
 */
export function downloadCsvFile(filename: string, csvContent: string): void {
  downloadTextFile(filename, csvContent, "text/csv;charset=utf-8");
}
