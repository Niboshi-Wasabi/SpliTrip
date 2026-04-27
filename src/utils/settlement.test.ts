/**
 * Unit tests for `settlement.ts` split math (minor units, remainders, next payer).
 */

import {
  computeEqualSplitParts,
  computeItemizedSplitParts,
  computePercentSplitParts,
  computeShareSplitParts,
  currencyMinorExponent,
  finalizeExactAmountSplits,
  suggestNextPayer,
  summarizeAllocatedMinor,
  toMinorUnits,
} from "./settlement";

describe("currencyMinorExponent / toMinorUnits", () => {
  it("JPY は整数単位", () => {
    expect(currencyMinorExponent("JPY")).toBe(0);
    expect(toMinorUnits(500, "JPY")).toBe(500);
  });

  it("USD はセント", () => {
    expect(currencyMinorExponent("USD")).toBe(2);
    expect(toMinorUnits(10.5, "USD")).toBe(1050);
  });
});

describe("computeEqualSplitParts", () => {
  it("JPY 100 を 3 人で端数を分配", () => {
    const parts = computeEqualSplitParts(100, ["a", "b", "c"], "JPY", {
      kind: "first_in_member_list",
    });
    const sum = parts.reduce(
      (runningTotal, splitPart) => runningTotal + splitPart.amount,
      0,
    );
    expect(sum).toBe(100);
    expect(parts.map((part) => part.amount).sort()).toEqual([33, 33, 34]);
  });
});

describe("computeShareSplitParts", () => {
  it("2:1 の比率で分割", () => {
    const shareResult = computeShareSplitParts(
      100,
      ["a", "b", "c"],
      [
        { userId: "a", weight: 2 },
        { userId: "b", weight: 1 },
        { userId: "c", weight: 0 },
      ],
      "JPY",
      { kind: "largest_remainder" },
    );
    expect(shareResult.ok).toBe(true);
    if (!shareResult.ok) {
      return;
    }
    const by = Object.fromEntries(
      shareResult.parts.map((part) => [part.userId, part.amount]),
    );
    expect(by.c).toBe(0);
    expect(by.a + by.b).toBe(100);
    expect(by.a).toBeGreaterThan(by.b);
  });
});

describe("computePercentSplitParts", () => {
  it("60/40", () => {
    const percentResult = computePercentSplitParts(
      100,
      ["a", "b"],
      [
        { userId: "a", percent: 60 },
        { userId: "b", percent: 40 },
      ],
      "JPY",
      { kind: "largest_remainder" },
    );
    expect(percentResult.ok).toBe(true);
    if (!percentResult.ok) {
      return;
    }
    const by = Object.fromEntries(
      percentResult.parts.map((part) => [part.userId, part.amount]),
    );
    expect(by.a + by.b).toBe(100);
    expect(by.a).toBe(60);
    expect(by.b).toBe(40);
  });
});

describe("computeItemizedSplitParts", () => {
  it("2 行の合計が総額と一致", () => {
    const itemizedResult = computeItemizedSplitParts(
      100,
      ["a", "b"],
      [
        { minorAmount: 60, participantIds: ["a", "b"] },
        { minorAmount: 40, participantIds: ["a"] },
      ],
      "JPY",
      { kind: "largest_remainder" },
    );
    expect(itemizedResult.ok).toBe(true);
    if (!itemizedResult.ok) {
      return;
    }
    const by = Object.fromEntries(
      itemizedResult.parts.map((part) => [part.userId, part.amount]),
    );
    expect(by.a).toBe(70);
    expect(by.b).toBe(30);
  });
});

describe("finalizeExactAmountSplits", () => {
  it("不足分を支払者に寄せる", () => {
    const exactResult = finalizeExactAmountSplits(
      ["a", "b"],
      { a: 40, b: 40 },
      100,
      "JPY",
      { kind: "payer", payerId: "a" },
    );
    expect(exactResult.ok).toBe(true);
    if (!exactResult.ok) {
      return;
    }
    const by = Object.fromEntries(
      exactResult.parts.map((part) => [part.userId, part.amount]),
    );
    expect(by.a + by.b).toBe(100);
    expect(by.a).toBe(60);
    expect(by.b).toBe(40);
  });
});

describe("summarizeAllocatedMinor", () => {
  it("差分を返す", () => {
    const allocationSummary = summarizeAllocatedMinor(100, "JPY", {
      a: 30,
      b: 30,
      c: 30,
    });
    expect(allocationSummary.targetMinor).toBe(100);
    expect(allocationSummary.sumMinor).toBe(90);
    expect(allocationSummary.deltaMinor).toBe(10);
  });
});

describe("suggestNextPayer", () => {
  it("最もネットが低い人", () => {
    const nextPayerSuggestion = suggestNextPayer(
      { a: 10, b: -5, c: -5 },
      ["a", "b", "c"],
    );
    expect(nextPayerSuggestion).not.toBeNull();
    expect(
      nextPayerSuggestion?.userId === "b" ||
        nextPayerSuggestion?.userId === "c",
    ).toBe(true);
  });
});
