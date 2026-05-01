"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type YearMonthDayTriple = { year: number; month: number; day: number };

type NumericOrUnset = "" | number;

function padSegment(segmentValue: number): string {
  return String(segmentValue).padStart(2, "0");
}

function calendarDaysInMonth(
  calendarYear: number,
  calendarMonthIndex1To12: number,
): number {
  return new Date(calendarYear, calendarMonthIndex1To12, 0).getDate();
}

function parseIsoBoundaryDate(isoString: string): YearMonthDayTriple | null {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoString.trim());
  if (!isoMatch) return null;
  const yearParsed = Number(isoMatch[1]);
  const monthParsed = Number(isoMatch[2]);
  const dayParsed = Number(isoMatch[3]);
  if (
    !Number.isFinite(yearParsed) ||
    !Number.isFinite(monthParsed) ||
    !Number.isFinite(dayParsed)
  ) {
    return null;
  }
  if (
    monthParsed < 1 ||
    monthParsed > 12 ||
    dayParsed < 1 ||
    dayParsed > calendarDaysInMonth(yearParsed, monthParsed)
  ) {
    return null;
  }
  return { year: yearParsed, month: monthParsed, day: dayParsed };
}

function buildIsoDateFromTriple(tripleValue: YearMonthDayTriple): string {
  const cappedDayNumber = Math.min(
    tripleValue.day,
    calendarDaysInMonth(tripleValue.year, tripleValue.month),
  );
  return `${tripleValue.year}-${padSegment(tripleValue.month)}-${padSegment(cappedDayNumber)}`;
}

function buildIsoFromSelections(
  yearSelection: NumericOrUnset,
  monthSelection: NumericOrUnset,
  daySelection: NumericOrUnset,
): string {
  if (yearSelection === "" || monthSelection === "" || daySelection === "") {
    return "";
  }
  return buildIsoDateFromTriple({
    year: yearSelection,
    month: monthSelection,
    day: daySelection,
  });
}

function createTodayTriple(): YearMonthDayTriple {
  const todayReference = new Date();
  return {
    year: todayReference.getFullYear(),
    month: todayReference.getMonth() + 1,
    day: todayReference.getDate(),
  };
}

function clampDayToMonthCapsule(
  yearSelection: NumericOrUnset,
  monthSelection: NumericOrUnset,
  daySelection: NumericOrUnset,
): NumericOrUnset {
  if (yearSelection === "" || monthSelection === "") {
    return daySelection === "" ? "" : daySelection;
  }
  const capsuleMaxDayCount = calendarDaysInMonth(yearSelection, monthSelection);
  if (daySelection === "") {
    return "";
  }
  return Math.min(daySelection, capsuleMaxDayCount);
}

type GroupPeriodFormProps = {
  groupId: string;
  initialPeriodStartDate: string | null;
  initialPeriodEndDate: string | null;
  canEdit: boolean;
};

const nativeSelectClasses =
  "h-11 min-h-[44px] w-[calc(33.333%-0.4rem)] min-w-[5rem] shrink-0 rounded-md border border-input bg-background px-2 text-sm shadow-sm md:h-10 md:min-h-0";

export function GroupPeriodForm({
  groupId,
  initialPeriodStartDate,
  initialPeriodEndDate,
  canEdit,
}: GroupPeriodFormProps) {
  const router = useRouter();
  const translations = useTranslations("GroupDetail");

  const pivotYearBase = useMemo(() => {
    const startParsed = parseIsoBoundaryDate(initialPeriodStartDate ?? "");
    if (startParsed) return startParsed.year;
    const endParsed = parseIsoBoundaryDate(initialPeriodEndDate ?? "");
    if (endParsed) return endParsed.year;
    return createTodayTriple().year;
  }, [initialPeriodStartDate, initialPeriodEndDate]);

  const yearChoices = useMemo(() => {
    const list: number[] = [];
    for (
      let yearCursor = pivotYearBase - 12;
      yearCursor <= pivotYearBase + 14;
      yearCursor += 1
    ) {
      list.push(yearCursor);
    }
    return list;
  }, [pivotYearBase]);

  const [editingPeriod, setEditingPeriod] = useState(false);

  const [committedHasPeriod, setCommittedHasPeriod] = useState(
    Boolean(
      initialPeriodStartDate &&
        initialPeriodEndDate &&
        parseIsoBoundaryDate(initialPeriodStartDate) &&
        parseIsoBoundaryDate(initialPeriodEndDate),
    ),
  );
  const [committedStartTriple, setCommittedStartTriple] = useState<YearMonthDayTriple>(
    () =>
      parseIsoBoundaryDate(initialPeriodStartDate ?? "") ?? createTodayTriple(),
  );
  const [committedEndTriple, setCommittedEndTriple] = useState<YearMonthDayTriple>(
    () =>
      parseIsoBoundaryDate(initialPeriodEndDate ?? "") ?? createTodayTriple(),
  );

  const [startYear, setStartYear] = useState<NumericOrUnset>("");
  const [startMonth, setStartMonth] = useState<NumericOrUnset>("");
  const [startDay, setStartDay] = useState<NumericOrUnset>("");
  const [endYear, setEndYear] = useState<NumericOrUnset>("");
  const [endMonth, setEndMonth] = useState<NumericOrUnset>("");
  const [endDay, setEndDay] = useState<NumericOrUnset>("");

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function applyCommittedSelectionsToDraft() {
    if (committedHasPeriod) {
      setStartYear(committedStartTriple.year);
      setStartMonth(committedStartTriple.month);
      setStartDay(committedStartTriple.day);
      setEndYear(committedEndTriple.year);
      setEndMonth(committedEndTriple.month);
      setEndDay(committedEndTriple.day);
    } else {
      const seedTriple = createTodayTriple();
      setStartYear(seedTriple.year);
      setStartMonth(seedTriple.month);
      setStartDay(seedTriple.day);
      setEndYear(seedTriple.year);
      setEndMonth(seedTriple.month);
      setEndDay(seedTriple.day);
    }
  }

  useEffect(() => {
    if (editingPeriod) return;
    const parsedStartTriple = parseIsoBoundaryDate(initialPeriodStartDate ?? "");
    const parsedEndTriple = parseIsoBoundaryDate(initialPeriodEndDate ?? "");
    if (
      parsedStartTriple !== null &&
      parsedEndTriple !== null &&
      initialPeriodStartDate &&
      initialPeriodEndDate
    ) {
      setCommittedHasPeriod(true);
      setCommittedStartTriple(parsedStartTriple);
      setCommittedEndTriple(parsedEndTriple);
    } else {
      setCommittedHasPeriod(false);
    }
  }, [
    editingPeriod,
    initialPeriodEndDate,
    initialPeriodStartDate,
  ]);

  function openEditingMode() {
    setEditingPeriod(true);
    setErrorMessage(null);
    applyCommittedSelectionsToDraft();
  }

  const startIsoDraft = buildIsoFromSelections(startYear, startMonth, startDay);
  const endIsoDraft = buildIsoFromSelections(endYear, endMonth, endDay);

  async function handleSavePeriod() {
    const startPartial =
      startYear !== "" || startMonth !== "" || startDay !== "";
    const endPartial = endYear !== "" || endMonth !== "" || endDay !== "";
    const bothSidesComplete = startIsoDraft.length > 0 && endIsoDraft.length > 0;
    const bothSidesEmpty =
      startYear === "" &&
      startMonth === "" &&
      startDay === "" &&
      endYear === "" &&
      endMonth === "" &&
      endDay === "";

    if ((startPartial || endPartial) && !bothSidesComplete) {
      setErrorMessage(translations("groupPeriodRequiredPair"));
      return;
    }
    if (bothSidesComplete && startIsoDraft > endIsoDraft) {
      setErrorMessage(translations("groupPeriodInvalidRange"));
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period_start_date: bothSidesEmpty ? "" : startIsoDraft,
          period_end_date: bothSidesEmpty ? "" : endIsoDraft,
        }),
      });

      const responseBody = (await response.json().catch(() => ({}))) as {
        error?: string;
        group?: {
          period_start_date?: string | null;
          period_end_date?: string | null;
        };
      };

      if (!response.ok) {
        if (responseBody.error === "period_required_pair") {
          setErrorMessage(translations("groupPeriodRequiredPair"));
          return;
        }
        if (responseBody.error === "period_invalid_range") {
          setErrorMessage(translations("groupPeriodInvalidRange"));
          return;
        }
        setErrorMessage(translations("groupPeriodSaveError"));
        return;
      }

      const nextStartBoundary = responseBody.group?.period_start_date ?? null;
      const nextEndBoundary = responseBody.group?.period_end_date ?? null;
      const nextHasBoth =
        typeof nextStartBoundary === "string" &&
        nextStartBoundary.length > 0 &&
        typeof nextEndBoundary === "string" &&
        nextEndBoundary.length > 0;

      if (nextHasBoth) {
        const parsedNextStart =
          parseIsoBoundaryDate(nextStartBoundary) ?? committedStartTriple;
        const parsedNextEnd =
          parseIsoBoundaryDate(nextEndBoundary) ?? committedEndTriple;
        setCommittedStartTriple(parsedNextStart);
        setCommittedEndTriple(parsedNextEnd);
        setCommittedHasPeriod(true);
      } else {
        setCommittedHasPeriod(false);
      }

      setEditingPeriod(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleClearPeriod() {
    setSaving(true);
    setErrorMessage(null);
    try {
      const clearResponse = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period_start_date: "",
          period_end_date: "",
        }),
      });
      await clearResponse.json().catch(() => ({}));

      if (!clearResponse.ok) {
        setErrorMessage(translations("groupPeriodSaveError"));
        return;
      }

      setCommittedHasPeriod(false);
      const seedTripleAfterClear = createTodayTriple();
      setStartYear(seedTripleAfterClear.year);
      setStartMonth(seedTripleAfterClear.month);
      setStartDay(seedTripleAfterClear.day);
      setEndYear(seedTripleAfterClear.year);
      setEndMonth(seedTripleAfterClear.month);
      setEndDay(seedTripleAfterClear.day);
      setEditingPeriod(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function BoundaryDateFields({
    labelHeading,
    idPrefixKey,
    yearSelection,
    monthSelection,
    daySelection,
    onYearSelectionChange,
    onMonthSelectionChange,
    onDaySelectionChange,
    disabledInput,
  }: {
    labelHeading: string;
    idPrefixKey: string;
    yearSelection: NumericOrUnset;
    monthSelection: NumericOrUnset;
    daySelection: NumericOrUnset;
    onYearSelectionChange: (nextYear: NumericOrUnset) => void;
    onMonthSelectionChange: (nextMonth: NumericOrUnset) => void;
    onDaySelectionChange: (nextDay: NumericOrUnset) => void;
    disabledInput: boolean;
  }) {
    const dayCountCapsule =
      yearSelection !== "" && monthSelection !== ""
        ? calendarDaysInMonth(yearSelection, monthSelection)
        : 31;

    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{labelHeading}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
          <select
            id={`${idPrefixKey}-year`}
            aria-label={`${labelHeading} (${translations("groupPeriodYearLabel")})`}
            className={nativeSelectClasses}
            disabled={disabledInput}
            value={yearSelection === "" ? "" : String(yearSelection)}
            onChange={(changeEvent) => {
              const rawValue = changeEvent.target.value;
              if (rawValue === "") {
                onYearSelectionChange("");
                onMonthSelectionChange("");
                onDaySelectionChange("");
              } else {
                const numericYearChoice = Number(rawValue);
                onYearSelectionChange(numericYearChoice);
                if (
                  monthSelection !== "" &&
                  daySelection !== "" &&
                  typeof daySelection === "number"
                ) {
                  onDaySelectionChange(
                    clampDayToMonthCapsule(
                      numericYearChoice,
                      monthSelection,
                      daySelection,
                    ),
                  );
                }
              }
            }}
          >
            <option value="">{translations("groupPeriodPartPlaceholder")}</option>
            {yearChoices.map((yearChoice) => (
              <option key={`${idPrefixKey}-y-${yearChoice}`} value={String(yearChoice)}>
                {yearChoice}
              </option>
            ))}
          </select>
          <span className="text-xs tabular-nums text-muted-foreground">
            {translations("groupPeriodYearLabel")}
          </span>
          <select
            id={`${idPrefixKey}-month`}
            aria-label={`${labelHeading} (${translations("groupPeriodMonthLabel")})`}
            className={nativeSelectClasses}
            disabled={disabledInput || yearSelection === ""}
            value={monthSelection === "" ? "" : String(monthSelection)}
            onChange={(changeEvent) => {
              const rawValue = changeEvent.target.value;
              if (rawValue === "") {
                onMonthSelectionChange("");
                onDaySelectionChange("");
                return;
              }
              const numericMonth = Number(rawValue);
              onMonthSelectionChange(numericMonth);
              if (yearSelection !== "") {
                const nextDayFromMonthChange = clampDayToMonthCapsule(
                  yearSelection,
                  numericMonth,
                  daySelection,
                );
                onDaySelectionChange(nextDayFromMonthChange);
              }
            }}
          >
            <option value="">{translations("groupPeriodPartPlaceholder")}</option>
            {Array.from({ length: 12 }, (_, monthIndex) => monthIndex + 1).map(
              (monthChoice) => (
                <option key={`${idPrefixKey}-m-${monthChoice}`} value={String(monthChoice)}>
                  {padSegment(monthChoice)}
                </option>
              ),
            )}
          </select>
          <span className="text-xs tabular-nums text-muted-foreground">
            {translations("groupPeriodMonthLabel")}
          </span>
          <select
            id={`${idPrefixKey}-day`}
            aria-label={`${labelHeading} (${translations("groupPeriodDayLabel")})`}
            className={nativeSelectClasses}
            disabled={
              disabledInput || yearSelection === "" || monthSelection === ""
            }
            value={daySelection === "" ? "" : String(daySelection)}
            onChange={(changeEvent) => {
              const rawValue = changeEvent.target.value;
              if (rawValue === "") {
                onDaySelectionChange("");
                return;
              }
              onDaySelectionChange(Number(rawValue));
            }}
          >
            <option value="">{translations("groupPeriodPartPlaceholder")}</option>
            {Array.from({ length: dayCountCapsule }, (_, dayIndex) => dayIndex + 1).map(
              (dayChoice) => (
                <option key={`${idPrefixKey}-d-${dayChoice}`} value={String(dayChoice)}>
                  {padSegment(dayChoice)}
                </option>
              ),
            )}
          </select>
          <span className="text-xs tabular-nums text-muted-foreground">
            {translations("groupPeriodDayLabel")}
          </span>
        </div>
      </div>
    );
  }

  if (!canEdit) {
    const nonOwnerStart = initialPeriodStartDate ?? "";
    const nonOwnerEnd = initialPeriodEndDate ?? "";
    return (
      <p className="mt-1 text-xs text-muted-foreground">
        {nonOwnerStart && nonOwnerEnd
          ? translations("groupPeriodValue", {
              start: nonOwnerStart,
              end: nonOwnerEnd,
            })
          : translations("groupPeriodUnset")}
      </p>
    );
  }

  if (!editingPeriod) {
    return (
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-xs text-muted-foreground">
          {committedHasPeriod
            ? translations("groupPeriodValue", {
                start: buildIsoDateFromTriple(committedStartTriple),
                end: buildIsoDateFromTriple(committedEndTriple),
              })
            : translations("groupPeriodUnset")}
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={cn("min-h-[44px] h-auto shrink-0 px-2", "md:min-h-0")}
          onClick={() => openEditingMode()}
        >
          <Pencil className="mr-1 h-3.5 w-3.5" />
          {translations("editGroupPeriod")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-4 rounded-lg border border-border bg-card/40 p-3 sm:p-4">
      <BoundaryDateFields
        labelHeading={translations("groupPeriodStartLabel")}
        idPrefixKey="period-start"
        yearSelection={startYear}
        monthSelection={startMonth}
        daySelection={startDay}
        onYearSelectionChange={(nextYearSelection) => {
          if (nextYearSelection === "") {
            setStartYear("");
            setStartMonth("");
            setStartDay("");
            return;
          }
          setStartYear(nextYearSelection);
        }}
        onMonthSelectionChange={setStartMonth}
        onDaySelectionChange={setStartDay}
        disabledInput={saving}
      />
      <BoundaryDateFields
        labelHeading={translations("groupPeriodEndLabel")}
        idPrefixKey="period-end"
        yearSelection={endYear}
        monthSelection={endMonth}
        daySelection={endDay}
        onYearSelectionChange={(nextYearSelection) => {
          if (nextYearSelection === "") {
            setEndYear("");
            setEndMonth("");
            setEndDay("");
            return;
          }
          setEndYear(nextYearSelection);
        }}
        onMonthSelectionChange={setEndMonth}
        onDaySelectionChange={setEndDay}
        disabledInput={saving}
      />
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          className="min-h-[44px] md:min-h-9"
          disabled={saving}
          onClick={() => void handleSavePeriod()}
        >
          {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
          {translations("saveGroupPeriod")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-[44px] md:min-h-9"
          disabled={saving}
          onClick={() => void handleClearPeriod()}
        >
          {translations("clearGroupPeriod")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="min-h-[44px] md:min-h-9"
          disabled={saving}
          onClick={() => {
            setEditingPeriod(false);
            setErrorMessage(null);
          }}
        >
          {translations("cancelGroupPeriod")}
        </Button>
      </div>
      {startIsoDraft.length > 0 && endIsoDraft.length > 0 ? (
        <p className="text-xs tabular-nums text-muted-foreground">
          {translations("groupPeriodPreviewHint", {
            start: startIsoDraft,
            end: endIsoDraft,
          })}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="text-xs text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
