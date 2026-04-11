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
    const sum = parts.reduce((s, p) => s + p.amount, 0);
    expect(sum).toBe(100);
    expect(parts.map((part) => part.amount).sort()).toEqual([33, 33, 34]);
  });
});

describe("computeShareSplitParts", () => {
  it("2:1 の比率で分割", () => {
    const r = computeShareSplitParts(
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
    expect(r.ok).toBe(true);
    if (!r.ok) {
      return;
    }
    const by = Object.fromEntries(
      r.parts.map((part) => [part.userId, part.amount]),
    );
    expect(by.c).toBe(0);
    expect(by.a + by.b).toBe(100);
    expect(by.a).toBeGreaterThan(by.b);
  });
});

describe("computePercentSplitParts", () => {
  it("60/40", () => {
    const r = computePercentSplitParts(
      100,
      ["a", "b"],
      [
        { userId: "a", percent: 60 },
        { userId: "b", percent: 40 },
      ],
      "JPY",
      { kind: "largest_remainder" },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) {
      return;
    }
    const by = Object.fromEntries(
      r.parts.map((part) => [part.userId, part.amount]),
    );
    expect(by.a + by.b).toBe(100);
    expect(by.a).toBe(60);
    expect(by.b).toBe(40);
  });
});

describe("computeItemizedSplitParts", () => {
  it("2 行の合計が総額と一致", () => {
    const r = computeItemizedSplitParts(
      100,
      ["a", "b"],
      [
        { minorAmount: 60, participantIds: ["a", "b"] },
        { minorAmount: 40, participantIds: ["a"] },
      ],
      "JPY",
      { kind: "largest_remainder" },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) {
      return;
    }
    const by = Object.fromEntries(
      r.parts.map((part) => [part.userId, part.amount]),
    );
    expect(by.a).toBe(70);
    expect(by.b).toBe(30);
  });
});

describe("finalizeExactAmountSplits", () => {
  it("不足分を支払者に寄せる", () => {
    const r = finalizeExactAmountSplits(
      ["a", "b"],
      { a: 40, b: 40 },
      100,
      "JPY",
      { kind: "payer", payerId: "a" },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) {
      return;
    }
    const by = Object.fromEntries(
      r.parts.map((part) => [part.userId, part.amount]),
    );
    expect(by.a + by.b).toBe(100);
    expect(by.a).toBe(60);
    expect(by.b).toBe(40);
  });
});

describe("summarizeAllocatedMinor", () => {
  it("差分を返す", () => {
    const s = summarizeAllocatedMinor(100, "JPY", { a: 30, b: 30, c: 30 });
    expect(s.targetMinor).toBe(100);
    expect(s.sumMinor).toBe(90);
    expect(s.deltaMinor).toBe(10);
  });
});

describe("suggestNextPayer", () => {
  it("最もネットが低い人", () => {
    const sug = suggestNextPayer(
      { a: 10, b: -5, c: -5 },
      ["a", "b", "c"],
    );
    expect(sug).not.toBeNull();
    expect(sug?.userId === "b" || sug?.userId === "c").toBe(true);
  });
});
