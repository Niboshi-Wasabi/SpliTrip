import {
  applyPaidStatusToSettlements,
  buildSettlementPairKey,
  sumUnsettledOwedByUser,
} from "@/lib/settlement-transactions";
import type { GroupSettlement } from "@/lib/group-ledger";

function baseSettlement(
  overrides: Partial<GroupSettlement> = {},
): GroupSettlement {
  return {
    fromUserId: "debtor",
    toUserId: "creditor",
    fromDisplayName: "Debtor",
    toDisplayName: "Creditor",
    amount: 1000,
    isMarkedPaid: false,
    markedPaidAt: null,
    ...overrides,
  };
}

describe("buildSettlementPairKey", () => {
  it("uses stable delimiter without row index", () => {
    expect(buildSettlementPairKey("a", "b")).toBe("a::b");
  });
});

describe("applyPaidStatusToSettlements", () => {
  it("marks paid when amount matches snapshot", () => {
    const result = applyPaidStatusToSettlements([baseSettlement()], [
      {
        from_user_id: "debtor",
        to_user_id: "creditor",
        amount: 1000,
        currency_code: "JPY",
        marked_at: "2026-07-07T00:00:00.000Z",
        status: "paid",
      },
    ]);
    expect(result[0]?.isMarkedPaid).toBe(true);
    expect(result[0]?.markedPaidAt).toBe("2026-07-07T00:00:00.000Z");
  });

  it("clears paid flag when recomputed amount differs", () => {
    const result = applyPaidStatusToSettlements(
      [baseSettlement({ amount: 1200 })],
      [
        {
          from_user_id: "debtor",
          to_user_id: "creditor",
          amount: 1000,
          currency_code: "JPY",
          marked_at: "2026-07-07T00:00:00.000Z",
          status: "paid",
        },
      ],
    );
    expect(result[0]?.isMarkedPaid).toBe(false);
  });
});

describe("sumUnsettledOwedByUser", () => {
  it("sums only unpaid debtor rows for the user", () => {
    const total = sumUnsettledOwedByUser(
      [
        baseSettlement({ fromUserId: "me", amount: 500, isMarkedPaid: false }),
        baseSettlement({
          fromUserId: "me",
          toUserId: "other",
          amount: 300,
          isMarkedPaid: true,
        }),
        baseSettlement({ fromUserId: "other", toUserId: "me", amount: 200 }),
      ],
      "me",
    );
    expect(total).toBe(500);
  });
});
