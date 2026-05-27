"use client";

/**
 * Client form to add a group expense with flexible split modes (equal, exact, shares, …).
 * Live validation mirrors `src/utils/settlement.ts` minor-unit math.
 */

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { broadcastGroupRefresh } from "@/lib/realtime-broadcast";
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
import { evaluateRestrictedAmountExpression } from "@/lib/arithmetic-expression";
import { convertAmount } from "@/utils/exchangeRates";
import { formatMoneyByCurrency } from "@/lib/currency-payment-amount";

type SplitMode = "equal" | "exact" | "shares" | "percent" | "itemized";

type RemainderUiKind =
  | "largest_remainder"
  | "payer"
  | "specific_user"
  | "first_member";

type ItemLine = {
  key: string;
  name: string;
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
  "flex min-h-[44px] cursor-pointer items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-[var(--apple-fill-tertiary)]/50 md:min-h-0 md:py-1";
const RADIO_INPUT_CLASS =
  "mt-[0.3125rem] h-4 w-4 shrink-0 cursor-pointer";

type Props = {
  groupId: string;
  members: GroupMemberRow[];
  currencyCode: string;
  exchangeRates: Record<string, number> | null;
  /** Logged-in user (for 「自分のみ」 in itemized participant selection). */
  currentUserId: string;
  groupPeriodStartDate: string | null;
  groupPeriodEndDate: string | null;
  onExpenseSaved?: () => void | Promise<void>;
};

function clampDateWithinRange(
  dateValue: string,
  minDate: string | null,
  maxDate: string | null,
): string {
  if (minDate && dateValue < minDate) {
    return minDate;
  }
  if (maxDate && dateValue > maxDate) {
    return maxDate;
  }
  return dateValue;
}

function localDateInputString(referenceDate: Date): string {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, "0");
  const day = String(referenceDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatAmountInputValue(amountValue: number, minorExponent: number): string {
  if (!Number.isFinite(amountValue)) {
    return "";
  }
  if (minorExponent === 0) {
    return String(Math.round(amountValue));
  }
  const factor = 10 ** minorExponent;
  const rounded = Math.round(amountValue * factor) / factor;
  return rounded.toFixed(minorExponent);
}

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

export function GroupExpensePanel({
  groupId,
  members,
  currencyCode,
  exchangeRates,
  currentUserId,
  groupPeriodStartDate,
  groupPeriodEndDate,
  onExpenseSaved,
}: Props) {
  const router = useRouter();
  const amountInputReference = useRef<HTMLInputElement>(null);
  const formTranslations = useTranslations("GroupExpenseForm");
  const helpTranslations = useTranslations("HelpTooltips");
  const categoryLabelTranslations = useTranslations("ExpenseCategory");
  const minorExp = currencyMinorExponent(currencyCode);
  const amountStep = minorExp === 0 ? "1" : "0.01";

  const [payerId, setPayerId] = useState(members[0]?.user_id ?? "");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(() =>
    clampDateWithinRange(
      localDateInputString(new Date()),
      groupPeriodStartDate,
      groupPeriodEndDate,
    ),
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
      name: "",
      amount: "",
      selected: Object.fromEntries(members.map((memberRow) => [memberRow.user_id, true])),
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amountExpressionHint, setAmountExpressionHint] = useState<
    string | null
  >(null);

  const [expenseCategoryId, setExpenseCategoryId] =
    useState<ExpenseCategoryId>("other");

  const parsedExpenseTotal = Number(amount);
  const expenseTotalIsValid =
    Number.isFinite(parsedExpenseTotal) && parsedExpenseTotal > 0;
  const memberIds = members.map((memberRow) => memberRow.user_id);
  const approximateJpyPreview = useMemo(() => {
    if (currencyCode.trim().toUpperCase() === "JPY" || !exchangeRates) {
      return null;
    }
    const trimmedAmount = amount.trim();
    if (!trimmedAmount) {
      return null;
    }
    const amountResolution = evaluateRestrictedAmountExpression(trimmedAmount);
    if (!amountResolution.ok) {
      return null;
    }
    const convertedAmount = convertAmount(
      amountResolution.value,
      currencyCode,
      "JPY",
      exchangeRates,
    );
    if (convertedAmount === null) {
      return null;
    }
    return formatMoneyByCurrency("JPY", Math.round(convertedAmount));
  }, [amount, currencyCode, exchangeRates]);

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

  const todayDateString = localDateInputString(new Date());
  const hideQuickDateButtons =
    groupPeriodEndDate !== null && groupPeriodEndDate < todayDateString;

  function applyExpenseDateFromDaysAgo(daysAgo: number) {
    const referenceDate = new Date();
    referenceDate.setHours(12, 0, 0, 0);
    referenceDate.setDate(referenceDate.getDate() - daysAgo);
    setExpenseDate(
      clampDateWithinRange(
        localDateInputString(referenceDate),
        groupPeriodStartDate,
        groupPeriodEndDate,
      ),
    );
  }

  function handleAmountInputBlur() {
    const trimmed = amount.trim();
    if (!trimmed) {
      setAmountExpressionHint(null);
      return;
    }
    const evaluated = evaluateRestrictedAmountExpression(trimmed);
    if (!evaluated.ok) {
      setAmountExpressionHint(formTranslations("amountExpressionInvalid"));
      return;
    }
    setAmountExpressionHint(null);
    setAmount(formatAmountInputValue(evaluated.value, minorExp));
  }

  function applyItemizedParticipantMode(
    lineKey: string,
    mode: "all" | "only_me",
  ) {
    setItemLines((previousLines) =>
      previousLines.map((lineEntry) => {
        if (lineEntry.key !== lineKey) {
          return lineEntry;
        }
        if (mode === "all") {
          return {
            ...lineEntry,
            selected: Object.fromEntries(
              members.map((memberRow) => [memberRow.user_id, true]),
            ),
          };
        }
        return {
          ...lineEntry,
          selected: Object.fromEntries(
            members.map((memberRow) => [
              memberRow.user_id,
              memberRow.user_id === currentUserId,
            ]),
          ),
        };
      }),
    );
  }

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
        name: "",
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

  function resetFormAfterSuccessfulSave(
    submitIntent: "save" | "saveAndAnother",
  ) {
    setAmount("");
    setDescription("");
    setExactByUser(
      Object.fromEntries(members.map((memberRow) => [memberRow.user_id, ""])),
    );
    setShareByUser(
      Object.fromEntries(members.map((memberRow) => [memberRow.user_id, "1"])),
    );
    setPercentByUser(() => {
      const equalShareText = members.length
        ? (100 / members.length).toFixed(2)
        : "0";
      return Object.fromEntries(
        members.map((memberRow) => [
          memberRow.user_id,
          equalShareText,
        ]),
      );
    });
    setItemLines([
      {
        key: crypto.randomUUID(),
        name: "",
        amount: "",
        selected: Object.fromEntries(
          members.map((memberRow) => [memberRow.user_id, true]),
        ),
      },
    ]);
    setExpenseCategoryId("other");
    setSubmitting(false);
    setAmountExpressionHint(null);
    broadcastGroupRefresh(groupId);
    router.refresh();
    if (submitIntent === "saveAndAnother") {
      setTimeout(() => {
        amountInputReference.current?.focus();
      }, 0);
    }
  }

  async function handleSubmit(
    formEvent: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    formEvent.preventDefault();
    const formElement = formEvent.currentTarget;
    const formData = new FormData(formElement);
    const intentRaw = formData.get("submitIntent");
    const submitIntent =
      intentRaw === "saveAndAnother" ? "saveAndAnother" : "save";

    const trimmedAmountRaw = amount.trim();
    const amountResolution = trimmedAmountRaw
      ? evaluateRestrictedAmountExpression(trimmedAmountRaw)
      : { ok: false as const };
    if (!amountResolution.ok) {
      setError(formTranslations("clientInvalidAmount"));
      return;
    }
    const resolvedExpenseTotalNumeric = amountResolution.value;
    if (!Number.isFinite(resolvedExpenseTotalNumeric) || resolvedExpenseTotalNumeric <= 0) {
      setError(formTranslations("clientInvalidAmount"));
      return;
    }
    setAmount(formatAmountInputValue(resolvedExpenseTotalNumeric, minorExp));
    setAmountExpressionHint(null);

    if (!payerId) {
      setError(formTranslations("clientSelectPayer"));
      return;
    }

    if (
      (groupPeriodStartDate && expenseDate < groupPeriodStartDate) ||
      (groupPeriodEndDate && expenseDate > groupPeriodEndDate)
    ) {
      setError(
        formTranslations("clientDateOutOfGroupPeriod", {
          start: groupPeriodStartDate ?? "",
          end: groupPeriodEndDate ?? "",
        }),
      );
      return;
    }

    if (splitMode === "percent" && Math.abs(percentSum - 100) > 0.05) {
      setError(formTranslations("clientPercentMust100"));
      return;
    }

    if (splitMode === "itemized") {
      const targetMinorResolved = toMinorUnits(
        resolvedExpenseTotalNumeric,
        currencyCode,
      );
      const itemizedOkNow =
        itemLines.length > 0 &&
        itemizedSumMinor === targetMinorResolved;
      if (!itemizedOkNow) {
        setError(formTranslations("clientItemizedMustMatch"));
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    const remainder_policy = policyToApi(remainderKind, remainderUserId);

    const base: Record<string, unknown> = {
      payer_id: payerId,
      amount: resolvedExpenseTotalNumeric,
      description: description.trim() || null,
      expense_date: expenseDate,
      category: expenseCategoryId,
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
        name: line.name.trim(),
        amount: Number(line.amount),
        participant_ids: memberIds.filter((id) => line.selected[id]),
      }));
    }

    const response = await fetch(`/api/groups/${groupId}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(base),
    });

    const payload: unknown = await response.json().catch(() => null);

    type CreateExpensePayload = {
      error?: string;
      receipt_error?: string | null;
    };

    if (!response.ok) {
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
        invalid_itemized_lines: formTranslations(
          "validationErrors.invalid_itemized_lines",
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

    resetFormAfterSuccessfulSave(submitIntent);
    await onExpenseSaved?.();
  }

  if (members.length === 0) {
    return (
      <p className="text-sm text-[var(--apple-text-secondary)]">
        {formTranslations("emptyMembers")}
      </p>
    );
  }

  return (
    <form
      onSubmit={(formEvent) => void handleSubmit(formEvent)}
      className="flex flex-col gap-4 rounded-lg border border-[var(--apple-separator)] bg-[var(--apple-card-bg)] p-3 sm:p-4"
    >
      <h3 className="text-sm font-semibold">{formTranslations("title")}</h3>

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
            ref={amountInputReference}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            value={amount}
            onChange={(changeEvent) => {
              setAmountExpressionHint(null);
              setError(null);
              setAmount(changeEvent.target.value);
            }}
            onBlur={() => handleAmountInputBlur()}
            disabled={submitting}
            required
            className="min-h-[44px] py-2 md:min-h-8 md:py-1"
            aria-describedby={
              amountExpressionHint ? "expense-amount-hint" : undefined
            }
          />
          {amountExpressionHint ? (
            <p
              id="expense-amount-hint"
              className="text-xs text-amber-800 dark:text-amber-200"
              role="status"
            >
              {amountExpressionHint}
            </p>
          ) : null}
          {approximateJpyPreview ? (
            <p className="text-xs text-[var(--apple-text-secondary)]" role="status">
              {formTranslations("jpyPreviewApprox", {
                amount: approximateJpyPreview,
              })}
            </p>
          ) : null}
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
        {!hideQuickDateButtons ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-[40px] shrink-0 px-3 md:min-h-8"
              disabled={submitting}
              onClick={() => applyExpenseDateFromDaysAgo(0)}
            >
              {formTranslations("dateChipToday")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-[40px] shrink-0 px-3 md:min-h-8"
              disabled={submitting}
              onClick={() => applyExpenseDateFromDaysAgo(1)}
            >
              {formTranslations("dateChipYesterday")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-[40px] shrink-0 px-3 md:min-h-8"
              disabled={submitting}
              onClick={() => applyExpenseDateFromDaysAgo(2)}
            >
              {formTranslations("dateChipTwoDaysAgo")}
            </Button>
          </div>
        ) : null}
        <Input
          id="edate"
          type="date"
          value={expenseDate}
          onChange={(changeEvent) => setExpenseDate(changeEvent.target.value)}
          disabled={submitting}
          className="min-h-[44px] md:min-h-8"
          min={groupPeriodStartDate ?? undefined}
          max={groupPeriodEndDate ?? undefined}
        />
        {groupPeriodStartDate && groupPeriodEndDate ? (
          <p className="text-xs text-[var(--apple-text-secondary)]">
            {formTranslations("dateRangeHint", {
              start: groupPeriodStartDate,
              end: groupPeriodEndDate,
            })}
          </p>
        ) : null}
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
          className="px-1 text-xs font-medium text-[var(--apple-text-secondary)]"
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
          <p className="text-xs text-[var(--apple-text-secondary)]">
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
          <p className="text-xs text-[var(--apple-text-secondary)]">
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
          <p className="text-xs text-[var(--apple-text-secondary)]">
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
                <span className="text-xs text-[var(--apple-text-secondary)]">%</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {splitMode === "itemized" ? (
        <div className="space-y-3 rounded-md border border-dashed p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[var(--apple-text-secondary)]">
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
                className="rounded-lg border bg-[var(--apple-fill-tertiary)]/30 p-3 space-y-2"
              >
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {formTranslations("itemizedLineName")}
                    </Label>
                    <Input
                      type="text"
                      maxLength={80}
                      className="w-48"
                      value={line.name}
                      onChange={(changeEvent) =>
                        setItemLines((previousLines) =>
                          previousLines.map((lineEntry) =>
                            lineEntry.key === line.key
                              ? {
                                  ...lineEntry,
                                  name: changeEvent.target.value,
                                }
                              : lineEntry,
                          ),
                        )
                      }
                      disabled={submitting}
                      placeholder={formTranslations("itemizedLineNamePlaceholder")}
                    />
                  </div>
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
                <div className="flex flex-wrap items-center gap-2 border-b border-[var(--apple-separator)]/60 pb-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-[40px] shrink-0 md:min-h-8"
                    disabled={submitting}
                    onClick={() =>
                      applyItemizedParticipantMode(line.key, "all")
                    }
                  >
                    {formTranslations("memberSelectAll")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-[40px] shrink-0 md:min-h-8"
                    disabled={submitting}
                    onClick={() =>
                      applyItemizedParticipantMode(line.key, "only_me")
                    }
                  >
                    {formTranslations("memberSelectOnlyMe")}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 pt-1 text-xs">
                  {members.map((memberRow) => (
                    <label
                      key={memberRow.user_id}
                      className="flex min-h-[36px] cursor-pointer items-start gap-2 rounded-md px-1 py-0.5 transition-colors hover:bg-[var(--apple-fill-tertiary)]/50 md:min-h-0"
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
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          type="submit"
          name="submitIntent"
          value="save"
          disabled={submitting}
          className="min-h-[44px] w-full sm:w-auto md:min-h-0"
        >
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {formTranslations("submitButton")}
        </Button>
        <Button
          type="submit"
          name="submitIntent"
          value="saveAndAnother"
          variant="outline"
          disabled={submitting}
          className="min-h-[44px] w-full sm:w-auto md:min-h-0"
        >
          {formTranslations("saveAndAddAnother")}
        </Button>
      </div>
    </form>
  );
}
