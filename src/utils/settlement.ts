/**
 * Pure settlement / expense-split math for group ledgers.
 * Amounts are tracked in "minor units" (whole yen for JPY, cents for USD-like currencies)
 * to avoid floating-point drift when distributing remainders.
 */

import { isZeroDecimalCurrency } from "@/lib/currency-payment-amount";

/** Exponent for minor units: 0 = whole currency unit, 2 = hundredths (e.g. cents). */
export function currencyMinorExponent(currencyCode: string): 0 | 2 {
  return isZeroDecimalCurrency(currencyCode.trim().toUpperCase()) ? 0 : 2;
}

/** Convert a display amount to integer minor units for the given ISO currency. */
export function toMinorUnits(amount: number, currencyCode: string): number {
  if (!Number.isFinite(amount)) {
    return 0;
  }
  const exponent = currencyMinorExponent(currencyCode);
  if (exponent === 0) {
    return Math.round(amount);
  }
  return Math.round(amount * 100);
}

/** Convert minor units back to a display-scale number. */
export function fromMinorUnits(minor: number, currencyCode: string): number {
  const exponent = currencyMinorExponent(currencyCode);
  if (exponent === 0) {
    return minor;
  }
  return minor / 100;
}

/**
 * How to assign indivisible remainder units (1 yen, 1 cent, …)
 * after proportional floor division.
 */
export type RemainderPolicy =
  | { kind: "largest_remainder" }
  | { kind: "payer"; payerId: string }
  | { kind: "specific_user"; userId: string }
  | { kind: "first_in_member_list" };

export type SplitPart = {
  userId: string;
  amount: number;
  ratio: number;
};

/** Build a per-user map initialized to zero minor units for every member. */
function createZeroMinorMap(memberUserIds: string[]): Record<string, number> {
  const minorByUserId: Record<string, number> = {};
  for (const userId of memberUserIds) {
    minorByUserId[userId] = 0;
  }
  return minorByUserId;
}

/**
 * Add `extraUnits` indivisible minor units across users according to `policy`.
 * Mutates `minorByUser` in place.
 */
export function applyRemainderMinorUnits(
  minorByUser: Record<string, number>,
  memberOrder: string[],
  extraUnits: number,
  policy: RemainderPolicy,
): void {
  if (extraUnits <= 0) {
    return;
  }

  const eligibleUserIds = memberOrder.filter(
    (userId) => minorByUser[userId] !== undefined,
  );
  if (eligibleUserIds.length === 0) {
    return;
  }

  if (policy.kind === "largest_remainder") {
    for (let unitIndex = 0; unitIndex < extraUnits; unitIndex++) {
      const userId = eligibleUserIds[unitIndex % eligibleUserIds.length]!;
      minorByUser[userId] = (minorByUser[userId] ?? 0) + 1;
    }
    return;
  }

  if (policy.kind === "first_in_member_list") {
    for (let unitIndex = 0; unitIndex < extraUnits; unitIndex++) {
      const userId = memberOrder[unitIndex % memberOrder.length]!;
      if (minorByUser[userId] !== undefined) {
        minorByUser[userId] = (minorByUser[userId] ?? 0) + 1;
      }
    }
    return;
  }

  if (policy.kind === "payer") {
    if (minorByUser[policy.payerId] !== undefined) {
      minorByUser[policy.payerId] =
        (minorByUser[policy.payerId] ?? 0) + extraUnits;
      return;
    }
    applyRemainderMinorUnits(minorByUser, memberOrder, extraUnits, {
      kind: "first_in_member_list",
    });
    return;
  }

  if (policy.kind === "specific_user") {
    if (minorByUser[policy.userId] !== undefined) {
      minorByUser[policy.userId] =
        (minorByUser[policy.userId] ?? 0) + extraUnits;
      return;
    }
    applyRemainderMinorUnits(minorByUser, memberOrder, extraUnits, {
      kind: "first_in_member_list",
    });
  }
}

/**
 * Hamilton / largest-remainder: give each extra unit to users with highest
 * fractional remainder scores (ties broken by `memberOrder`).
 */
export function applyLargestRemainderMinorUnits(
  minorByUser: Record<string, number>,
  memberOrder: string[],
  floorRows: { userId: string; remainderScore: number }[],
  extraUnits: number,
): void {
  if (extraUnits <= 0) {
    return;
  }
  const sortedByRemainder = [...floorRows].sort(
    (left, right) =>
      right.remainderScore - left.remainderScore ||
      memberOrder.indexOf(left.userId) - memberOrder.indexOf(right.userId),
  );
  for (let unitIndex = 0; unitIndex < extraUnits; unitIndex++) {
    const remainderEntry = sortedByRemainder[unitIndex];
    if (!remainderEntry) {
      break;
    }
    minorByUser[remainderEntry.userId] = (minorByUser[remainderEntry.userId] ?? 0) + 1;
  }
}

/** Split `totalAmount` equally across `memberUserIds` in minor units. */
export function computeEqualSplitParts(
  totalAmount: number,
  memberUserIds: string[],
  currencyCode: string,
  policy: RemainderPolicy = { kind: "largest_remainder" },
): SplitPart[] {
  if (memberUserIds.length === 0) {
    return [];
  }
  const totalMinor = toMinorUnits(totalAmount, currencyCode);
  if (totalMinor <= 0) {
    return [];
  }

  const memberCount = memberUserIds.length;
  const baseMinorPerMember = Math.floor(totalMinor / memberCount);
  const remainderUnits = totalMinor - baseMinorPerMember * memberCount;
  const minorByUser = createZeroMinorMap(memberUserIds);
  for (const userId of memberUserIds) {
    minorByUser[userId] = baseMinorPerMember;
  }

  if (policy.kind === "largest_remainder") {
    applyRemainderMinorUnits(
      minorByUser,
      memberUserIds,
      remainderUnits,
      { kind: "first_in_member_list" },
    );
  } else {
    applyRemainderMinorUnits(
      minorByUser,
      memberUserIds,
      remainderUnits,
      policy,
    );
  }

  return toSplitParts(minorByUser, memberUserIds, totalMinor, currencyCode);
}

function toSplitParts(
  minorByUser: Record<string, number>,
  memberOrder: string[],
  totalMinor: number,
  currencyCode: string,
): SplitPart[] {
  return memberOrder.map((userId) => {
    const minorForUser = minorByUser[userId] ?? 0;
    return {
      userId,
      amount: fromMinorUnits(minorForUser, currencyCode),
      ratio: totalMinor > 0 ? minorForUser / totalMinor : 0,
    };
  });
}

export type ShareSplitInput = { userId: string; weight: number };

/**
 * Proportional split by positive weights (zero weight excludes a member).
 * Uses BigInt scaling to avoid precision loss on large totals.
 */
export function computeShareSplitParts(
  totalAmount: number,
  memberUserIds: string[],
  inputs: ShareSplitInput[],
  currencyCode: string,
  policy: RemainderPolicy,
): { ok: true; parts: SplitPart[] } | { ok: false; error: string } {
  const totalMinor = toMinorUnits(totalAmount, currencyCode);
  if (totalMinor <= 0) {
    return { ok: false, error: "invalid_total" };
  }

  const weightByUserId = new Map<string, number>();
  for (const userId of memberUserIds) {
    weightByUserId.set(userId, 0);
  }
  for (const shareInput of inputs) {
    if (!memberUserIds.includes(shareInput.userId)) {
      return { ok: false, error: "unknown_member" };
    }
    if (!Number.isFinite(shareInput.weight) || shareInput.weight < 0) {
      return { ok: false, error: "invalid_weight" };
    }
    weightByUserId.set(shareInput.userId, shareInput.weight);
  }

  const activeMemberIds = memberUserIds.filter(
    (userId) => (weightByUserId.get(userId) ?? 0) > 0,
  );
  if (activeMemberIds.length === 0) {
    return { ok: false, error: "no_positive_weights" };
  }

  const WEIGHT_SCALE = 1_000_000;
  const scaledWeights = activeMemberIds.map((userId) => {
    const rawWeight = weightByUserId.get(userId)!;
    const scaledWeightBigInt = BigInt(
      Math.max(1, Math.round(rawWeight * WEIGHT_SCALE)),
    );
    return { userId, scaledWeightBigInt };
  });
  const sumWeightsBigInt = scaledWeights.reduce(
    (accumulator, weightEntry) => accumulator + weightEntry.scaledWeightBigInt,
    BigInt(0),
  );
  if (sumWeightsBigInt === BigInt(0)) {
    return { ok: false, error: "no_positive_weights" };
  }

  const minorByUser = createZeroMinorMap(memberUserIds);
  const floorRows: { userId: string; remainderScore: number }[] = [];
  let sumFlooredMinor = 0;
  const totalMinorBigInt = BigInt(totalMinor);

  for (const { userId, scaledWeightBigInt } of scaledWeights) {
    const product = totalMinorBigInt * scaledWeightBigInt;
    const flooredMinor = Number(product / sumWeightsBigInt);
    const remainderModSumWeights = Number(product % sumWeightsBigInt);
    minorByUser[userId] = flooredMinor;
    floorRows.push({ userId, remainderScore: remainderModSumWeights });
    sumFlooredMinor += flooredMinor;
  }

  const extraUnits = totalMinor - sumFlooredMinor;
  if (policy.kind === "largest_remainder") {
    applyLargestRemainderMinorUnits(
      minorByUser,
      memberUserIds,
      floorRows,
      extraUnits,
    );
  } else {
    applyRemainderMinorUnits(minorByUser, memberUserIds, extraUnits, policy);
  }

  return {
    ok: true,
    parts: toSplitParts(minorByUser, memberUserIds, totalMinor, currencyCode),
  };
}

export type PercentSplitInput = { userId: string; percent: number };

/** Percent split; percents are stored as basis points (1% = 100 bp), sum must be 10_000 ± 5. */
export function computePercentSplitParts(
  totalAmount: number,
  memberUserIds: string[],
  inputs: PercentSplitInput[],
  currencyCode: string,
  policy: RemainderPolicy,
): { ok: true; parts: SplitPart[] } | { ok: false; error: string } {
  const totalMinor = toMinorUnits(totalAmount, currencyCode);
  if (totalMinor <= 0) {
    return { ok: false, error: "invalid_total" };
  }

  const percentByUserId = new Map<string, number>();
  for (const userId of memberUserIds) {
    percentByUserId.set(userId, 0);
  }
  for (const percentInput of inputs) {
    if (!memberUserIds.includes(percentInput.userId)) {
      return { ok: false, error: "unknown_member" };
    }
    if (!Number.isFinite(percentInput.percent) || percentInput.percent < 0) {
      return { ok: false, error: "invalid_percent" };
    }
    percentByUserId.set(percentInput.userId, percentInput.percent);
  }

  const basisPointsByUserId = new Map<string, number>();
  let sumBasisPoints = 0;
  for (const userId of memberUserIds) {
    const percentValue = percentByUserId.get(userId) ?? 0;
    const basisPoints = Math.round(percentValue * 100);
    basisPointsByUserId.set(userId, basisPoints);
    sumBasisPoints += basisPoints;
  }
  if (Math.abs(sumBasisPoints - 10_000) > 5) {
    return { ok: false, error: "percent_sum_not_100" };
  }

  const activeMemberIds = memberUserIds.filter(
    (userId) => (basisPointsByUserId.get(userId) ?? 0) > 0,
  );
  if (activeMemberIds.length === 0) {
    return { ok: false, error: "no_positive_percent" };
  }

  const minorByUser = createZeroMinorMap(memberUserIds);
  const floorRows: { userId: string; remainderScore: number }[] = [];
  let sumFlooredMinor = 0;
  const totalMinorBigInt = BigInt(totalMinor);
  const basisPointDenominator = BigInt(10000);

  for (const userId of activeMemberIds) {
    const basisPointsBigInt = BigInt(basisPointsByUserId.get(userId)!);
    const product = totalMinorBigInt * basisPointsBigInt;
    const flooredMinor = Number(product / basisPointDenominator);
    const remainderModDenominator = Number(product % basisPointDenominator);
    minorByUser[userId] = flooredMinor;
    floorRows.push({ userId, remainderScore: remainderModDenominator });
    sumFlooredMinor += flooredMinor;
  }

  const extraUnits = totalMinor - sumFlooredMinor;
  if (policy.kind === "largest_remainder") {
    applyLargestRemainderMinorUnits(
      minorByUser,
      memberUserIds,
      floorRows,
      extraUnits,
    );
  } else {
    applyRemainderMinorUnits(minorByUser, memberUserIds, extraUnits, policy);
  }

  return {
    ok: true,
    parts: toSplitParts(minorByUser, memberUserIds, totalMinor, currencyCode),
  };
}

export type ItemizedLineInput = {
  /** Line total in minor units (derived from the UI amount field). */
  minorAmount: number;
  participantIds: string[];
};

/**
 * Each line is split equally among its participants; user totals must equal `totalAmount`.
 */
export function computeItemizedSplitParts(
  totalAmount: number,
  memberUserIds: string[],
  lines: ItemizedLineInput[],
  currencyCode: string,
  linePolicy: RemainderPolicy = { kind: "largest_remainder" },
): { ok: true; parts: SplitPart[] } | { ok: false; error: string } {
  const targetMinor = toMinorUnits(totalAmount, currencyCode);
  if (targetMinor <= 0) {
    return { ok: false, error: "invalid_total" };
  }

  const memberIdSet = new Set(memberUserIds);
  const minorByUser = createZeroMinorMap(memberUserIds);
  let sumLineMinors = 0;

  for (const line of lines) {
    if (!Number.isFinite(line.minorAmount) || line.minorAmount <= 0) {
      return { ok: false, error: "invalid_line_amount" };
    }
    const uniqueParticipantIds = line.participantIds.filter(
      (userId, index, array) =>
        memberIdSet.has(userId) && array.indexOf(userId) === index,
    );
    if (uniqueParticipantIds.length === 0) {
      return { ok: false, error: "line_no_participants" };
    }
    for (const userId of line.participantIds) {
      if (!memberIdSet.has(userId)) {
        return { ok: false, error: "line_unknown_member" };
      }
    }

    sumLineMinors += line.minorAmount;
    const participantCount = uniqueParticipantIds.length;
    const baseMinorPerParticipant = Math.floor(
      line.minorAmount / participantCount,
    );
    const lineRemainderUnits =
      line.minorAmount - baseMinorPerParticipant * participantCount;
    const lineMinorByUser = createZeroMinorMap(memberUserIds);
    for (const userId of uniqueParticipantIds) {
      lineMinorByUser[userId] = baseMinorPerParticipant;
    }
    applyRemainderMinorUnits(
      lineMinorByUser,
      uniqueParticipantIds,
      lineRemainderUnits,
      linePolicy,
    );
    for (const userId of memberUserIds) {
      minorByUser[userId] =
        (minorByUser[userId] ?? 0) + (lineMinorByUser[userId] ?? 0);
    }
  }

  if (sumLineMinors !== targetMinor) {
    return { ok: false, error: "itemized_sum_mismatch" };
  }

  return {
    ok: true,
    parts: toSplitParts(minorByUser, memberUserIds, targetMinor, currencyCode),
  };
}

export type SplitTotalsSummary = {
  targetMinor: number;
  sumMinor: number;
  deltaMinor: number;
};

/** Compare target total vs sum of per-user minor allocations (for live UI validation). */
export function summarizeAllocatedMinor(
  targetAmount: number,
  currencyCode: string,
  allocatedMinorByUser: Record<string, number>,
): SplitTotalsSummary {
  const targetMinor = toMinorUnits(targetAmount, currencyCode);
  const sumMinor = Object.values(allocatedMinorByUser).reduce(
    (accumulator, value) =>
      accumulator + (Number.isFinite(value) ? value : 0),
    0,
  );
  return {
    targetMinor,
    sumMinor,
    deltaMinor: targetMinor - sumMinor,
  };
}

/**
 * Exact amounts: round each input to minor units, then fix any delta vs `targetAmount`
 * using `policy` (add units or shave from members in a deterministic order).
 */
export function finalizeExactAmountSplits(
  memberUserIds: string[],
  rawAmountByUser: Record<string, number>,
  targetAmount: number,
  currencyCode: string,
  policy: RemainderPolicy,
): { ok: true; parts: SplitPart[] } | { ok: false; error: string } {
  const targetMinor = toMinorUnits(targetAmount, currencyCode);
  if (targetMinor <= 0) {
    return { ok: false, error: "invalid_total" };
  }

  const minorByUser = createZeroMinorMap(memberUserIds);
  for (const userId of memberUserIds) {
    const raw = rawAmountByUser[userId];
    if (!Number.isFinite(raw) || raw < 0) {
      return { ok: false, error: "invalid_split_amount" };
    }
    minorByUser[userId] = toMinorUnits(raw, currencyCode);
  }

  const sumAllocatedMinor = memberUserIds.reduce(
    (accumulator, userId) => accumulator + (minorByUser[userId] ?? 0),
    0,
  );
  const deltaMinor = targetMinor - sumAllocatedMinor;
  if (deltaMinor === 0) {
    return {
      ok: true,
      parts: toSplitParts(minorByUser, memberUserIds, targetMinor, currencyCode),
    };
  }

  const adjustedMinorByUser = createZeroMinorMap(memberUserIds);
  for (const userId of memberUserIds) {
    adjustedMinorByUser[userId] = minorByUser[userId] ?? 0;
  }

  if (deltaMinor > 0) {
    applyRemainderMinorUnits(
      adjustedMinorByUser,
      memberUserIds,
      deltaMinor,
      policy,
    );
  } else {
    let unitsStillToRemove = -deltaMinor;
    const subtractionOrder =
      policy.kind === "specific_user"
        ? [
            policy.userId,
            ...memberUserIds.filter((userId) => userId !== policy.userId),
          ]
        : policy.kind === "payer"
          ? [
              policy.payerId,
              ...memberUserIds.filter((userId) => userId !== policy.payerId),
            ]
          : [...memberUserIds].reverse();

    for (const userId of subtractionOrder) {
      if (unitsStillToRemove <= 0) {
        break;
      }
      const currentMinor = adjustedMinorByUser[userId] ?? 0;
      const removable = Math.min(currentMinor, unitsStillToRemove);
      adjustedMinorByUser[userId] = currentMinor - removable;
      unitsStillToRemove -= removable;
    }
    if (unitsStillToRemove > 0) {
      return { ok: false, error: "exact_adjust_over_negative" };
    }
  }

  const finalSum = memberUserIds.reduce(
    (accumulator, userId) => accumulator + (adjustedMinorByUser[userId] ?? 0),
    0,
  );
  if (finalSum !== targetMinor) {
    return { ok: false, error: "split_sum_mismatch" };
  }

  return {
    ok: true,
    parts: toSplitParts(
      adjustedMinorByUser,
      memberUserIds,
      targetMinor,
      currencyCode,
    ),
  };
}

/**
 * Heuristic "who should pay next": member with lowest net balance (largest group debt).
 */
export function suggestNextPayer(
  netBalanceByUserId: Record<string, number>,
  memberUserIds: string[],
): { userId: string; netBalance: number } | null {
  if (memberUserIds.length === 0) {
    return null;
  }
  let lowest: { userId: string; netBalance: number } | null = null;
  for (const userId of memberUserIds) {
    const balance = netBalanceByUserId[userId] ?? 0;
    if (lowest === null || balance < lowest.netBalance) {
      lowest = { userId, netBalance: balance };
    }
  }
  return lowest;
}
