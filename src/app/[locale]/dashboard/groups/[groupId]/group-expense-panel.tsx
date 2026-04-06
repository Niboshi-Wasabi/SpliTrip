"use client";

/**
 * Client form to add a group expense with flexible split modes (equal, exact, shares, …).
 * Live validation mirrors `src/utils/settlement.ts` minor-unit math.
 */

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Camera, Loader2, Lock } from "lucide-react";
import { broadcastGroupRefresh } from "@/lib/realtime-broadcast";
import { analyzeReceipt } from "@/actions/analyzeReceipt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { currencyMinorExponent } from "@/utils/settlement";
import type { GroupMemberRow } from "@/lib/group-queries";
import { UserAvatar } from "@/components/user-avatar";
import { summarizeAllocatedMinor, toMinorUnits } from "@/utils/settlement";
import { ExpenseCategoryIcon } from "@/components/expense-category-icon";
import { HelpHint } from "@/components/help/help-hint";
import {
  EXPENSE_CATEGORY_IDS,
  type ExpenseCategoryId,
} from "@/lib/expense-categories";
import { useUpgradeModal } from "@/components/premium/upgrade-modal-context";

type SplitMode = "equal" | "exact" | "shares" | "percent" | "itemized";

type RemainderUiKind =
  | "largest_remainder"
  | "payer"
  | "specific_user"
  | "first_member";

type ItemLine = {
  key: string;
  amount: string;
  selected: Record<string, boolean>;
};

/**
 * Native `<input type="radio">` looks vertically offset next to text when using `items-center`
 * on a tall row (`min-h-[44px]`). `items-start` plus a small top margin on the control aligns
 * the circle with the first line’s cap height.
 * タッチ用の高い行で `items-center` だとラジオがテキストより上に見えるため、上揃え＋微調整で合わせる。
 */
const RADIO_LABEL_ROW_CLASS =
  "flex min-h-[44px] cursor-pointer items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/50 md:min-h-0 md:py-1";
const RADIO_INPUT_CLASS =
  "mt-[0.3125rem] h-4 w-4 shrink-0 cursor-pointer";

type Props = {
  groupId: string;
  members: GroupMemberRow[];
  currencyCode: string;
};

function policyToApi(
  kind: RemainderUiKind,
  specificUserId: string,
): Record<string, string> {
  if (kind === "payer") {
    return { type: "payer" };
  }
  if (kind === "specific_user") {
    return { type: "specific_user", user_id: specificUserId };
  }
  if (kind === "first_member") {
    return { type: "first_member" };
  }
  return { type: "largest_remainder" };
}

/**
 * クライアントで画像を最大幅にリサイズし base64 に変換する。
 * Resize the image on the client to a max dimension and return as base64.
 *
 * サーバーアクションのペイロード上限を超えないよう事前に圧縮する。
 * Pre-compress to stay within server action payload limits.
 */
function resizeImageToBase64(
  file: File,
  maxDimension: number,
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let targetWidth = img.width;
        let targetHeight = img.height;
        if (targetWidth > maxDimension || targetHeight > maxDimension) {
          const scaleFactor =
            maxDimension / Math.max(targetWidth, targetHeight);
          targetWidth = Math.round(targetWidth * scaleFactor);
          targetHeight = Math.round(targetHeight * scaleFactor);
        }
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Canvas not supported"));
          return;
        }
        context.drawImage(img, 0, 0, targetWidth, targetHeight);
        const outputMime = "image/jpeg";
        const dataUrl = canvas.toDataURL(outputMime, 0.85);
        const pureBase64 = dataUrl.split(",")[1];
        resolve({ base64: pureBase64, mimeType: outputMime });
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function GroupExpensePanel({
  groupId,
  members,
  currencyCode,
}: Props) {
  const router = useRouter();
  const receiptTranslations = useTranslations("ReceiptScan");
  const premiumTranslations = useTranslations("Premium");
  const formTranslations = useTranslations("GroupExpenseForm");
  const { hasPremiumAccess, freeOcrRemaining, openUpgradeModal } =
    useUpgradeModal();
  const helpTranslations = useTranslations("HelpTooltips");
  const categoryLabelTranslations = useTranslations("ExpenseCategory");
  const minorExp = currencyMinorExponent(currencyCode);
  const amountStep = minorExp === 0 ? "1" : "0.01";

  const [payerId, setPayerId] = useState(members[0]?.user_id ?? "");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [remainderKind, setRemainderKind] =
    useState<RemainderUiKind>("largest_remainder");
  const [remainderUserId, setRemainderUserId] = useState(
    () => members[0]?.user_id ?? "",
  );

  const [exactByUser, setExactByUser] = useState<Record<string, string>>(() =>
    Object.fromEntries(members.map((memberRow) => [memberRow.user_id, ""])),
  );
  const [shareByUser, setShareByUser] = useState<Record<string, string>>(() =>
    Object.fromEntries(members.map((memberRow) => [memberRow.user_id, "1"])),
  );
  const [percentByUser, setPercentByUser] = useState<Record<string, string>>(
    () => {
      if (members.length === 0) {
        return {};
      }
      const each = (100 / members.length).toFixed(2);
      return Object.fromEntries(members.map((memberRow) => [memberRow.user_id, each]));
    },
  );
  const [itemLines, setItemLines] = useState<ItemLine[]>(() => [
    {
      key: crypto.randomUUID(),
      amount: "",
      selected: Object.fromEntries(members.map((memberRow) => [memberRow.user_id, true])),
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expenseCategoryId, setExpenseCategoryId] =
    useState<ExpenseCategoryId>("other");
  const [pendingReceipt, setPendingReceipt] = useState<{
    base64: string;
    mimeType: string;
  } | null>(null);

  // --- AI レシートスキャン / AI receipt scan ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);

  const MAX_IMAGE_DIMENSION = 1536;

  const ocrBlockedForFree =
    !hasPremiumAccess && freeOcrRemaining !== null && freeOcrRemaining <= 0;

  function openReceiptFilePicker() {
    if (ocrBlockedForFree) {
      openUpgradeModal();
      return;
    }
    fileInputRef.current?.click();
  }

  async function handleReceiptScan(
    fileChangeEvent: React.ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFile = fileChangeEvent.target.files?.[0];
    if (!selectedFile) return;

    // ファイル選択をリセット（同じ画像を再選択可能にする）
    // Reset file input so the same image can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setScanning(true);
    setScanMessage(null);
    setError(null);

    try {
      if (!hasPremiumAccess && freeOcrRemaining === 0) {
        openUpgradeModal();
        setScanning(false);
        return;
      }

      const { base64, mimeType } = await resizeImageToBase64(
        selectedFile,
        MAX_IMAGE_DIMENSION,
      );

      setPendingReceipt({ base64, mimeType });

      const result = await analyzeReceipt(base64, mimeType);

      if (result.data === null) {
        const errorCode =
          "code" in result ? result.code : undefined;
        if (errorCode === "OCR_LIMIT") {
          setScanMessage({
            tone: "error",
            text: receiptTranslations("ocrLimitReached"),
          });
        } else {
          setScanMessage({
            tone: "error",
            text: `${receiptTranslations("error")} (${result.error})`,
          });
        }
        setScanning(false);
        return;
      }

      // 抽出結果をフォームにセットする / Populate form with extracted data
      const extractedData = result.data;
      if (!extractedData) {
        setScanMessage({ tone: "error", text: receiptTranslations("error") });
        setScanning(false);
        return;
      }

      if (extractedData.amount > 0) {
        setAmount(String(extractedData.amount));
      }
      if (extractedData.description) {
        setDescription(extractedData.description);
      }
      if (extractedData.date) {
        setExpenseDate(extractedData.date);
      }

      setScanMessage({
        tone: "ok",
        text: receiptTranslations("success"),
      });
      router.refresh();
    } catch (caughtError) {
      const errorText =
        caughtError instanceof Error ? caughtError.message : "Unknown error";
      setScanMessage({
        tone: "error",
        text: `${receiptTranslations("error")} (${errorText})`,
      });
    } finally {
      setScanning(false);
    }
  }

  const parsedExpenseTotal = Number(amount);
  const expenseTotalIsValid =
    Number.isFinite(parsedExpenseTotal) && parsedExpenseTotal > 0;
  const memberIds = members.map((memberRow) => memberRow.user_id);

  const exactSummary = useMemo(() => {
    if (!expenseTotalIsValid) {
      return null;
    }
    const minorBy: Record<string, number> = {};
    for (const memberRow of members) {
      const parsedExact = Number(exactByUser[memberRow.user_id] ?? "");
      minorBy[memberRow.user_id] = toMinorUnits(
        Number.isFinite(parsedExact) && parsedExact >= 0 ? parsedExact : 0,
        currencyCode,
      );
    }
    return summarizeAllocatedMinor(
      parsedExpenseTotal,
      currencyCode,
      minorBy,
    );
  }, [
    expenseTotalIsValid,
    parsedExpenseTotal,
    members,
    exactByUser,
    currencyCode,
  ]);

  const percentSum = useMemo(() => {
    let runningPercentTotal = 0;
    for (const memberRow of members) {
      const parsedPercent = Number(percentByUser[memberRow.user_id] ?? "");
      if (Number.isFinite(parsedPercent)) {
        runningPercentTotal += parsedPercent;
      }
    }
    return runningPercentTotal;
  }, [members, percentByUser]);

  const itemizedLinesMinor = useMemo(() => {
    return itemLines.map((line) => {
      const lineAmountValue = Number(line.amount);
      return {
        line,
        minor:
          Number.isFinite(lineAmountValue) && lineAmountValue > 0
            ? toMinorUnits(lineAmountValue, currencyCode)
            : 0,
      };
    });
  }, [itemLines, currencyCode]);

  const itemizedSumMinor = useMemo(
    () =>
      itemizedLinesMinor.reduce(
        (runningSum, entry) => runningSum + entry.minor,
        0,
      ),
    [itemizedLinesMinor],
  );

  const targetMinor = expenseTotalIsValid
    ? toMinorUnits(parsedExpenseTotal, currencyCode)
    : 0;
  const itemizedMatches =
    expenseTotalIsValid &&
    itemizedSumMinor === targetMinor &&
    itemLines.length > 0;

  const validationHint = useMemo(() => {
    if (!expenseTotalIsValid) {
      return null;
    }
    if (splitMode === "exact" && exactSummary) {
      if (exactSummary.deltaMinor === 0) {
        return {
          tone: "ok" as const,
          text: formTranslations("hintExactOk"),
        };
      }
      return {
        tone: "warn" as const,
        text:
          exactSummary.deltaMinor > 0
            ? formTranslations("validationHintExactShort", {
                units: exactSummary.deltaMinor,
              })
            : formTranslations("validationHintExactOver", {
                units: -exactSummary.deltaMinor,
              }),
      };
    }
    if (splitMode === "percent") {
      if (Math.abs(percentSum - 100) <= 0.05) {
        return {
          tone: "ok" as const,
          text: formTranslations("validationHintPercentOk"),
        };
      }
      return {
        tone: "warn" as const,
        text: formTranslations("validationHintPercentWarn", {
          sum: percentSum.toFixed(2),
        }),
      };
    }
    if (splitMode === "itemized") {
      if (itemizedMatches) {
        return {
          tone: "ok" as const,
          text: formTranslations("validationHintItemizedOk"),
        };
      }
      return {
        tone: "warn" as const,
        text: formTranslations("validationHintItemizedWarn", {
          delta: targetMinor - itemizedSumMinor,
        }),
      };
    }
    return null;
  }, [
    expenseTotalIsValid,
    splitMode,
    exactSummary,
    percentSum,
    itemizedMatches,
    targetMinor,
    itemizedSumMinor,
    formTranslations,
  ]);

  function updateExact(userId: string, value: string) {
    setExactByUser((prev) => ({ ...prev, [userId]: value }));
  }

  function updateShare(userId: string, value: string) {
    setShareByUser((prev) => ({ ...prev, [userId]: value }));
  }

  function updatePercent(userId: string, value: string) {
    setPercentByUser((prev) => ({ ...prev, [userId]: value }));
  }

  function addItemLine() {
    setItemLines((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        amount: "",
        selected: Object.fromEntries(members.map((memberRow) => [memberRow.user_id, true])),
      },
    ]);
  }

  function removeItemLine(lineKey: string) {
    setItemLines((previousLines) =>
      previousLines.length <= 1
        ? previousLines
        : previousLines.filter((lineEntry) => lineEntry.key !== lineKey),
    );
  }

  async function onSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    if (!expenseTotalIsValid) {
      setError(formTranslations("clientInvalidAmount"));
      return;
    }
    if (!payerId) {
      setError(formTranslations("clientSelectPayer"));
      return;
    }

    if (splitMode === "percent" && Math.abs(percentSum - 100) > 0.05) {
      setError(formTranslations("clientPercentMust100"));
      return;
    }

    if (splitMode === "itemized" && !itemizedMatches) {
      setError(formTranslations("clientItemizedMustMatch"));
      return;
    }

    setSubmitting(true);
    setError(null);

    const remainder_policy = policyToApi(remainderKind, remainderUserId);

    const base: Record<string, unknown> = {
      payer_id: payerId,
      amount: parsedExpenseTotal,
      description: description.trim() || null,
      expense_date: expenseDate,
      category: expenseCategoryId,
      split_mode: splitMode,
      remainder_policy,
    };

    if (pendingReceipt !== null) {
      base.receipt_base64 = pendingReceipt.base64;
      base.receipt_mime_type = pendingReceipt.mimeType;
    }

    if (splitMode === "exact") {
      base.manual_splits = members.map((memberRow) => ({
        user_id: memberRow.user_id,
        amount: Number(exactByUser[memberRow.user_id] ?? "") || 0,
      }));
    } else if (splitMode === "shares") {
      base.share_inputs = members.map((memberRow) => ({
        user_id: memberRow.user_id,
        weight: Number(shareByUser[memberRow.user_id] ?? "") || 0,
      }));
    } else if (splitMode === "percent") {
      base.percent_inputs = members.map((memberRow) => ({
        user_id: memberRow.user_id,
        percent: Number(percentByUser[memberRow.user_id] ?? "") || 0,
      }));
    } else if (splitMode === "itemized") {
      base.itemized_lines = itemLines.map((line) => ({
        amount: Number(line.amount),
        participant_ids: memberIds.filter((id) => line.selected[id]),
      }));
    }

    const res = await fetch(`/api/groups/${groupId}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(base),
    });

    const payload: unknown = await res.json().catch(() => null);

    type CreateExpensePayload = {
      error?: string;
      receipt_error?: string | null;
    };

    if (!res.ok) {
      const code =
        typeof payload === "object" &&
        payload !== null &&
        "error" in payload &&
        typeof (payload as { error: unknown }).error === "string"
          ? (payload as { error: string }).error
          : "request_failed";
      const serverMessage =
        typeof payload === "object" &&
        payload !== null &&
        "message" in payload &&
        typeof (payload as { message: unknown }).message === "string"
          ? (payload as { message: string }).message
          : null;
      const messages: Record<string, string> = {
        split_sum_mismatch: formTranslations("validationErrors.split_sum_mismatch"),
        manual_splits_required: formTranslations(
          "validationErrors.manual_splits_required",
        ),
        share_inputs_required: formTranslations(
          "validationErrors.share_inputs_required",
        ),
        percent_inputs_required: formTranslations(
          "validationErrors.percent_inputs_required",
        ),
        percent_sum_not_100: formTranslations(
          "validationErrors.percent_sum_not_100",
        ),
        itemized_lines_required: formTranslations(
          "validationErrors.itemized_lines_required",
        ),
        itemized_sum_mismatch: formTranslations(
          "validationErrors.itemized_sum_mismatch",
        ),
        invalid_line_amount: formTranslations(
          "validationErrors.invalid_line_amount",
        ),
        line_no_participants: formTranslations(
          "validationErrors.line_no_participants",
        ),
        exact_adjust_failed: formTranslations(
          "validationErrors.exact_adjust_failed",
        ),
        invalid_split_amount: formTranslations(
          "validationErrors.invalid_split_amount",
        ),
        invalid_payer: formTranslations("validationErrors.invalid_payer"),
        no_positive_weights: formTranslations(
          "validationErrors.no_positive_weights",
        ),
        invalid_percent: formTranslations("validationErrors.invalid_percent"),
        invalid_weight: formTranslations("validationErrors.invalid_weight"),
        unknown_member: formTranslations("validationErrors.unknown_member"),
        invalid_total: formTranslations("validationErrors.invalid_total"),
      };
      const fallback = serverMessage
        ? formTranslations("submitFailedWithDetails", {
            code,
            details: serverMessage,
          })
        : formTranslations("submitFailedCode", { code });
      setError(messages[code] ?? fallback);
      setSubmitting(false);
      return;
    }

    const successPayload = payload as CreateExpensePayload | null;
    if (
      successPayload?.receipt_error &&
      String(successPayload.receipt_error).length > 0
    ) {
      setError(formTranslations("receiptUploadFailed"));
    }

    setAmount("");
    setDescription("");
    setExactByUser(Object.fromEntries(members.map((memberRow) => [memberRow.user_id, ""])));
    setShareByUser(Object.fromEntries(members.map((memberRow) => [memberRow.user_id, "1"])));
    setPercentByUser(() => {
      const each = members.length ? (100 / members.length).toFixed(2) : "0";
      return Object.fromEntries(members.map((memberRow) => [memberRow.user_id, each]));
    });
    setItemLines([
      {
        key: crypto.randomUUID(),
        amount: "",
        selected: Object.fromEntries(members.map((memberRow) => [memberRow.user_id, true])),
      },
    ]);
    setExpenseCategoryId("other");
    setPendingReceipt(null);
    setSubmitting(false);
    broadcastGroupRefresh(groupId);
    router.refresh();
  }

  if (members.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {formTranslations("emptyMembers")}
      </p>
    );
  }

  return (
    <form
      onSubmit={(formEvent) => void onSubmit(formEvent)}
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-3 sm:p-4"
    >
      <h3 className="text-sm font-semibold">{formTranslations("title")}</h3>

      {/* AI レシートスキャン / AI receipt scan section */}
      <div className="flex flex-col gap-2 rounded-md border border-dashed border-blue-300 bg-blue-50/50 p-3 dark:border-blue-800 dark:bg-blue-950/20">
        <div className="flex flex-wrap items-center gap-2">
          {/* capture="environment": スマホの背面カメラを直接起動する / Launch rear camera on mobile */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(fileEvent) => void handleReceiptScan(fileEvent)}
            disabled={scanning || submitting}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={scanning || submitting}
            onClick={openReceiptFilePicker}
            className="min-h-[44px] gap-1.5 md:min-h-0"
            aria-label={
              ocrBlockedForFree
                ? premiumTranslations("ocrScanLockedAria")
                : receiptTranslations("button")
            }
          >
            {scanning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : ocrBlockedForFree ? (
              <Lock className="h-4 w-4" aria-hidden />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            {scanning
              ? receiptTranslations("scanning")
              : hasPremiumAccess
                ? premiumTranslations("aiScanLabelPro")
                : receiptTranslations("aiScanRemaining", {
                    count: freeOcrRemaining ?? 0,
                  })}
          </Button>
          <span className="text-[11px] text-muted-foreground">
            {receiptTranslations("hint")}
          </span>
        </div>
        {scanMessage ? (
          <p
            className={
              scanMessage.tone === "ok"
                ? "text-xs text-emerald-700 dark:text-emerald-400"
                : "text-xs text-red-600 dark:text-red-400"
            }
            role="status"
          >
            {scanMessage.text}
          </p>
        ) : null}
        {pendingReceipt ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{formTranslations("receiptPending")}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-[44px] px-2 md:min-h-0"
              disabled={submitting || scanning}
              onClick={() => setPendingReceipt(null)}
            >
              {formTranslations("clearReceiptAttach")}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="payer">{formTranslations("payerLabel")}</Label>
          <select
            id="payer"
            className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 md:h-8"
            value={payerId}
            onChange={(changeEvent) => setPayerId(changeEvent.target.value)}
            disabled={submitting}
          >
            {members.map((memberRow) => (
              <option key={memberRow.user_id} value={memberRow.user_id}>
                {memberRow.display_name}
                {memberRow.role === "owner"
                  ? formTranslations("ownerSuffix")
                  : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">
            {minorExp === 0
              ? formTranslations("amountLabelInteger", {
                  currency: currencyCode,
                })
              : formTranslations("amountLabelDecimal", {
                  currency: currencyCode,
                })}
          </Label>
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            min={minorExp === 0 ? 1 : 0.01}
            step={amountStep}
            value={amount}
            onChange={(changeEvent) => setAmount(changeEvent.target.value)}
            disabled={submitting}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="desc">{formTranslations("descriptionLabel")}</Label>
        <Input
          id="desc"
          value={description}
          onChange={(changeEvent) => setDescription(changeEvent.target.value)}
          placeholder={formTranslations("descriptionPlaceholder")}
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edate">{formTranslations("dateLabel")}</Label>
        <Input
          id="edate"
          type="date"
          value={expenseDate}
          onChange={(changeEvent) => setExpenseDate(changeEvent.target.value)}
          disabled={submitting}
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          {formTranslations("categoryLegend")}
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {EXPENSE_CATEGORY_IDS.map((categoryId) => (
            <label
              key={categoryId}
              className={RADIO_LABEL_ROW_CLASS}
            >
              <input
                type="radio"
                name="expenseCategoryId"
                className={RADIO_INPUT_CLASS}
                checked={expenseCategoryId === categoryId}
                onChange={() => setExpenseCategoryId(categoryId)}
                disabled={submitting}
              />
              <ExpenseCategoryIcon
                categoryId={categoryId}
                className="mt-[0.3125rem] h-4 w-4 shrink-0"
              />
              <span className="min-w-0 flex-1 leading-snug">
                {categoryLabelTranslations(categoryId)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="flex w-full items-center gap-1 text-sm font-medium">
          <span>{formTranslations("splitModeLegend")}</span>
          <HelpHint
            ariaLabel={helpTranslations("splitModeAria")}
            title={helpTranslations("splitModeTitle")}
            body={helpTranslations("splitModeBody")}
          />
        </legend>
        <div className="flex flex-col gap-2 text-sm">
          {(
            [
              ["equal", formTranslations("splitModeEqual")],
              ["exact", formTranslations("splitModeExact")],
              ["shares", formTranslations("splitModeShares")],
              ["percent", formTranslations("splitModePercent")],
              ["itemized", formTranslations("splitModeItemized")],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className={RADIO_LABEL_ROW_CLASS}>
              <input
                type="radio"
                name="splitMode"
                className={RADIO_INPUT_CLASS}
                checked={splitMode === value}
                onChange={() => setSplitMode(value)}
                disabled={submitting}
              />
              <span className="min-w-0 flex-1 leading-snug">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/*
        fieldset + legend はブラウザが凡例の横に最初の数行だけインデントを付けることがあり、
        上段のラジオだけ右にずれて見える。div + role="group" でレイアウトを統一する。
        fieldset/legend can indent only the first rows beside the legend; div+role="group" avoids it.
      */}
      <div
        role="group"
        aria-labelledby="expense-remainder-policy-heading"
        className="space-y-2 rounded-md border border-dashed p-3"
      >
        <p
          id="expense-remainder-policy-heading"
          className="px-1 text-xs font-medium text-muted-foreground"
        >
          {formTranslations("remainderHeading")}
        </p>
        <div className="flex flex-col gap-2 text-sm">
          <label className={RADIO_LABEL_ROW_CLASS}>
            <input
              type="radio"
              name="rem"
              className={RADIO_INPUT_CLASS}
              checked={remainderKind === "largest_remainder"}
              onChange={() => setRemainderKind("largest_remainder")}
              disabled={submitting}
            />
            <span className="min-w-0 flex-1 leading-snug">
              {formTranslations("remainderLargestRemainder")}
            </span>
          </label>
          <label className={RADIO_LABEL_ROW_CLASS}>
            <input
              type="radio"
              name="rem"
              className={RADIO_INPUT_CLASS}
              checked={remainderKind === "payer"}
              onChange={() => setRemainderKind("payer")}
              disabled={submitting}
            />
            <span className="min-w-0 flex-1 leading-snug">
              {formTranslations("remainderPayer")}
            </span>
          </label>
          <label className={RADIO_LABEL_ROW_CLASS}>
            <input
              type="radio"
              name="rem"
              className={RADIO_INPUT_CLASS}
              checked={remainderKind === "specific_user"}
              onChange={() => setRemainderKind("specific_user")}
              disabled={submitting}
            />
            <span className="min-w-0 flex-1 leading-snug">
              {formTranslations("remainderSpecificUser")}
            </span>
          </label>
          {remainderKind === "specific_user" ? (
            <select
              className="ml-6 h-8 max-w-xs rounded-lg border border-input bg-transparent px-2 text-sm"
              value={remainderUserId}
              onChange={(changeEvent) =>
                setRemainderUserId(changeEvent.target.value)
              }
              disabled={submitting}
            >
              {members.map((memberRow) => (
                <option key={memberRow.user_id} value={memberRow.user_id}>
                  {memberRow.display_name}
                </option>
              ))}
            </select>
          ) : null}
          <label className={RADIO_LABEL_ROW_CLASS}>
            <input
              type="radio"
              name="rem"
              className={RADIO_INPUT_CLASS}
              checked={remainderKind === "first_member"}
              onChange={() => setRemainderKind("first_member")}
              disabled={submitting}
            />
            <span className="min-w-0 flex-1 leading-snug">
              {formTranslations("remainderFirstMember")}
            </span>
          </label>
        </div>
      </div>

      {splitMode === "exact" ? (
        <div className="space-y-2 rounded-md border border-dashed p-3">
          <p className="text-xs text-muted-foreground">
            {formTranslations("exactIntro")}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {members.map((memberRow) => (
              <div key={memberRow.user_id} className="flex items-center gap-2">
                <UserAvatar
                  displayName={memberRow.display_name}
                  avatarUrl={memberRow.avatar_url}
                  size="sm"
                />
                <Label className="w-28 shrink-0 truncate text-xs">
                  {memberRow.display_name}
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={amountStep}
                  className="flex-1"
                  value={exactByUser[memberRow.user_id] ?? ""}
                  onChange={(changeEvent) =>
                    updateExact(memberRow.user_id, changeEvent.target.value)
                  }
                  disabled={submitting}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {splitMode === "shares" ? (
        <div className="space-y-2 rounded-md border border-dashed p-3">
          <p className="text-xs text-muted-foreground">
            {formTranslations("sharesZeroHint")}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {members.map((memberRow) => (
              <div key={memberRow.user_id} className="flex items-center gap-2">
                <UserAvatar
                  displayName={memberRow.display_name}
                  avatarUrl={memberRow.avatar_url}
                  size="sm"
                />
                <Label className="w-28 shrink-0 truncate text-xs">
                  {memberRow.display_name}
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.1"
                  className="flex-1"
                  value={shareByUser[memberRow.user_id] ?? ""}
                  onChange={(changeEvent) =>
                    updateShare(memberRow.user_id, changeEvent.target.value)
                  }
                  disabled={submitting}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {splitMode === "percent" ? (
        <div className="space-y-2 rounded-md border border-dashed p-3">
          <p className="text-xs text-muted-foreground">
            {formTranslations("percentIntro")}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {members.map((memberRow) => (
              <div key={memberRow.user_id} className="flex items-center gap-2">
                <UserAvatar
                  displayName={memberRow.display_name}
                  avatarUrl={memberRow.avatar_url}
                  size="sm"
                />
                <Label className="w-28 shrink-0 truncate text-xs">
                  {memberRow.display_name}
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step="0.01"
                  className="flex-1"
                  value={percentByUser[memberRow.user_id] ?? ""}
                  onChange={(changeEvent) =>
                    updatePercent(memberRow.user_id, changeEvent.target.value)
                  }
                  disabled={submitting}
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {splitMode === "itemized" ? (
        <div className="space-y-3 rounded-md border border-dashed p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {formTranslations("itemizedIntro")}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={addItemLine}
              disabled={submitting}
            >
              {formTranslations("itemizedAddRow")}
            </Button>
          </div>
          <div className="space-y-3">
            {itemLines.map((line) => (
              <div
                key={line.key}
                className="rounded-lg border bg-muted/30 p-3 space-y-2"
              >
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {formTranslations("itemizedLineAmount")}
                    </Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={minorExp === 0 ? 1 : 0.01}
                      step={amountStep}
                      className="w-32"
                      value={line.amount}
                      onChange={(changeEvent) =>
                        setItemLines((previousLines) =>
                          previousLines.map((lineEntry) =>
                            lineEntry.key === line.key
                              ? {
                                  ...lineEntry,
                                  amount: changeEvent.target.value,
                                }
                              : lineEntry,
                          ),
                        )
                      }
                      disabled={submitting}
                    />
                  </div>
                  {itemLines.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItemLine(line.key)}
                      disabled={submitting}
                    >
                      {formTranslations("itemizedRemoveRow")}
                    </Button>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {members.map((memberRow) => (
                    <label
                      key={memberRow.user_id}
                      className="flex min-h-[36px] cursor-pointer items-start gap-2 rounded-md px-1 py-0.5 transition-colors hover:bg-muted/50 md:min-h-0"
                    >
                      <input
                        type="checkbox"
                        className="mt-[0.2rem] h-4 w-4 shrink-0 cursor-pointer"
                        checked={Boolean(line.selected[memberRow.user_id])}
                        onChange={(changeEvent) =>
                          setItemLines((previousLines) =>
                            previousLines.map((lineEntry) =>
                              lineEntry.key === line.key
                                ? {
                                    ...lineEntry,
                                    selected: {
                                      ...lineEntry.selected,
                                      [memberRow.user_id]:
                                        changeEvent.target.checked,
                                    },
                                  }
                                : lineEntry,
                            ),
                          )
                        }
                        disabled={submitting}
                      />
                      <UserAvatar
                        displayName={memberRow.display_name}
                        avatarUrl={memberRow.avatar_url}
                        size="sm"
                      />
                      {memberRow.display_name}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {validationHint ? (
        <p
          className={
            validationHint.tone === "ok"
              ? "text-xs text-emerald-700 dark:text-emerald-400"
              : "text-xs text-amber-800 dark:text-amber-200"
          }
          role="status"
        >
          {validationHint.text}
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {/* min-h-[44px]: タッチターゲット確保 / Ensure touch target size on mobile */}
      <Button type="submit" disabled={submitting} className="min-h-[44px] md:min-h-0">
        {submitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        {formTranslations("submitButton")}
      </Button>
    </form>
  );
}
