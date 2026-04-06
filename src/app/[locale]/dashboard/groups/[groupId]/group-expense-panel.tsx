"use client";

/**
 * Client form to add a group expense with Splitwise-style split modes.
 * Live validation mirrors `src/utils/settlement.ts` minor-unit math.
 */

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Camera, Loader2 } from "lucide-react";
import { broadcastGroupRefresh } from "@/lib/realtime-broadcast";
import { analyzeReceipt } from "@/actions/analyzeReceipt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { currencyMinorExponent } from "@/utils/settlement";
import type { GroupMemberRow } from "@/lib/group-queries";
import { UserAvatar } from "@/components/user-avatar";
import { summarizeAllocatedMinor, toMinorUnits } from "@/utils/settlement";

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

  // --- AI レシートスキャン / AI receipt scan ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);

  const MAX_IMAGE_DIMENSION = 1536;

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
      const { base64, mimeType } = await resizeImageToBase64(
        selectedFile,
        MAX_IMAGE_DIMENSION,
      );

      const result = await analyzeReceipt(base64, mimeType);

      if (result.error) {
        setScanMessage({
          tone: "error",
          text: `${receiptTranslations("error")} (${result.error})`,
        });
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
        return { tone: "ok" as const, text: "按分の合計が支払額と一致しています。" };
      }
      return {
        tone: "warn" as const,
        text:
          exactSummary.deltaMinor > 0
            ? `不足: 最小通貨単位で ${exactSummary.deltaMinor} 不足（保存時に端数設定で加算されます）`
            : `超過: 最小通貨単位で ${-exactSummary.deltaMinor} 超過（保存時に端数設定で減算されます）`,
      };
    }
    if (splitMode === "percent") {
      if (Math.abs(percentSum - 100) <= 0.05) {
        return { tone: "ok" as const, text: "パーセントの合計は 100% です。" };
      }
      return {
        tone: "warn" as const,
        text: `パーセント合計: ${percentSum.toFixed(2)}%（100% 付近にしてください）`,
      };
    }
    if (splitMode === "itemized") {
      if (itemizedMatches) {
        return {
          tone: "ok" as const,
          text: "項目金額の合計が支払額と一致しています。",
        };
      }
      return {
        tone: "warn" as const,
        text: `項目の合計と支払額が一致していません（差: 最小単位 ${targetMinor - itemizedSumMinor}）。`,
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
      setError("金額を正しく入力してください");
      return;
    }
    if (!payerId) {
      setError("支払者を選んでください");
      return;
    }

    if (splitMode === "percent" && Math.abs(percentSum - 100) > 0.05) {
      setError("パーセントの合計を 100% にしてください");
      return;
    }

    if (splitMode === "itemized" && !itemizedMatches) {
      setError("項目別の金額の合計を、支払額と一致させてください");
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
      split_mode: splitMode,
      remainder_policy,
    };

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
        split_sum_mismatch: "按分の合計が支払額と一致しません",
        manual_splits_required: "金額指定の入力が必要です",
        share_inputs_required: "比率（シェア）を入力してください",
        percent_inputs_required: "パーセントを入力してください",
        percent_sum_not_100: "パーセントの合計が 100% ではありません",
        itemized_lines_required: "項目を1行以上追加してください",
        itemized_sum_mismatch: "項目の合計が支払額と一致しません",
        invalid_line_amount: "項目の金額が不正です",
        line_no_participants: "各項目で負担するメンバーを1人以上選んでください",
        exact_adjust_failed: "端数調整後に按分が負になってしまいます。金額を見直してください",
        invalid_split_amount: "按分金額が不正です",
        invalid_payer: "支払者が無効です",
        no_positive_weights: "比率は1人以上で正の値にしてください",
        invalid_percent: "パーセントが不正です",
        invalid_weight: "比率が不正です",
        unknown_member: "無効なメンバーが含まれています",
        invalid_total: "金額が不正です",
      };
      const fallback = serverMessage
        ? `登録に失敗しました（${code}）: ${serverMessage}`
        : `登録に失敗しました（${code}）`;
      setError(messages[code] ?? fallback);
      setSubmitting(false);
      return;
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
    setSubmitting(false);
    broadcastGroupRefresh(groupId);
    router.refresh();
  }

  if (members.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        メンバーがいないため出費を登録できません。
      </p>
    );
  }

  return (
    <form
      onSubmit={(formEvent) => void onSubmit(formEvent)}
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-3 sm:p-4"
    >
      <h3 className="text-sm font-semibold">出費を追加</h3>

      {/* AI レシートスキャン / AI receipt scan section */}
      <div className="flex flex-col gap-2 rounded-md border border-dashed border-blue-300 bg-blue-50/50 p-3 dark:border-blue-800 dark:bg-blue-950/20">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(fileEvent) => void handleReceiptScan(fileEvent)}
            disabled={scanning || submitting}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={scanning || submitting}
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] gap-1.5 md:min-h-0"
          >
            {scanning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            {scanning
              ? receiptTranslations("scanning")
              : receiptTranslations("button")}
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="payer">支払者</Label>
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
                {memberRow.role === "owner" ? "（オーナー）" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">
            金額（{currencyCode}
            {minorExp === 0 ? "・整数" : "・小数可"}）
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
        <Label htmlFor="desc">内容</Label>
        <Input
          id="desc"
          value={description}
          onChange={(changeEvent) => setDescription(changeEvent.target.value)}
          placeholder="例: 夕食"
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edate">日付</Label>
        <Input
          id="edate"
          type="date"
          value={expenseDate}
          onChange={(changeEvent) => setExpenseDate(changeEvent.target.value)}
          disabled={submitting}
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">按分モード</legend>
        <div className="flex flex-col gap-2 text-sm">
          {(
            [
              ["equal", "均等割り（Equally）"],
              ["exact", "金額指定（Exact amounts）"],
              ["shares", "比率・シェア（Shares）"],
              ["percent", "パーセント（Percentages）"],
              ["itemized", "項目別（Itemized）"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-muted/50 md:min-h-0">
              <input
                type="radio"
                name="splitMode"
                checked={splitMode === value}
                onChange={() => setSplitMode(value)}
                disabled={submitting}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2 rounded-md border border-dashed p-3">
        <legend className="px-1 text-xs font-medium text-muted-foreground">
          端数の扱い（比率・パーセント・均等などで発生する最小単位の差）
        </legend>
        <div className="flex flex-col gap-2 text-sm">
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-muted/50 md:min-h-0">
            <input
              type="radio"
              name="rem"
              checked={remainderKind === "largest_remainder"}
              onChange={() => setRemainderKind("largest_remainder")}
              disabled={submitting}
            />
            最大剰余法（おすすめ・Splitwise に近い）
          </label>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-muted/50 md:min-h-0">
            <input
              type="radio"
              name="rem"
              checked={remainderKind === "payer"}
              onChange={() => setRemainderKind("payer")}
              disabled={submitting}
            />
            支払者が端数を負担
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="rem"
              checked={remainderKind === "specific_user"}
              onChange={() => setRemainderKind("specific_user")}
              disabled={submitting}
            />
            指定メンバーが端数を負担
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
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="rem"
              checked={remainderKind === "first_member"}
              onChange={() => setRemainderKind("first_member")}
              disabled={submitting}
            />
            メンバー一覧の先頭から順に端数を分配
          </label>
        </div>
      </fieldset>

      {splitMode === "exact" ? (
        <div className="space-y-2 rounded-md border border-dashed p-3">
          <p className="text-xs text-muted-foreground">
            各メンバーの負担額。合計が支払額とずれる場合は、上記の「端数の扱い」で調整されます。
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
            相対的な比率（例: 2 と 1 なら 2:1）。0
            の人は按分から除外されます。
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
            全員ぶんのパーセントの合計がちょうど 100% になるようにしてください。
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
              品目ごとに金額と負担者を指定。行の合計が上の支払額と一致する必要があります。
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={addItemLine}
              disabled={submitting}
            >
              行を追加
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
                    <Label className="text-xs">項目金額</Label>
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
                      削除
                    </Button>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {members.map((memberRow) => (
                    <label
                      key={memberRow.user_id}
                      className="flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors hover:bg-muted/50 md:min-h-0"
                    >
                      <input
                        type="checkbox"
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
        出費を登録
      </Button>
    </form>
  );
}
