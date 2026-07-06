"use client";

import { mutate } from "swr";
import { buildSettlementPairKey } from "@/lib/settlement-transactions";
import type { GroupSettlement } from "@/lib/group-ledger";

type GroupDetailApiPayload = {
  data?: {
    expenses?: Array<{ id: string }>;
    settlements?: GroupSettlement[];
  };
};

function removeExpenseFromCache(
  currentValue: GroupDetailApiPayload | undefined,
  expenseId: string,
): GroupDetailApiPayload {
  const normalizedCurrentValue = currentValue ?? {};
  if (!normalizedCurrentValue.data?.expenses) {
    return normalizedCurrentValue;
  }
  return {
    ...normalizedCurrentValue,
    data: {
      ...normalizedCurrentValue.data,
      expenses: normalizedCurrentValue.data.expenses.filter(
        (expenseRow) => expenseRow.id !== expenseId,
      ),
    },
  };
}

function markSettlementPaidInCache(
  currentValue: GroupDetailApiPayload | undefined,
  fromUserId: string,
  toUserId: string,
  markedAt: string,
): GroupDetailApiPayload {
  const normalizedCurrentValue = currentValue ?? {};
  if (!normalizedCurrentValue.data?.settlements) {
    return normalizedCurrentValue;
  }
  const pairKey = buildSettlementPairKey(fromUserId, toUserId);
  return {
    ...normalizedCurrentValue,
    data: {
      ...normalizedCurrentValue.data,
      settlements: normalizedCurrentValue.data.settlements.map((settlementRow) => {
        if (
          buildSettlementPairKey(
            settlementRow.fromUserId,
            settlementRow.toUserId,
          ) !== pairKey
        ) {
          return settlementRow;
        }
        return {
          ...settlementRow,
          isMarkedPaid: true,
          markedPaidAt: markedAt,
        };
      }),
    },
  };
}

export function useGroupOptimisticMutations(groupId: string) {
  const groupDetailKey = `/api/groups/${groupId}`;

  async function deleteExpenseOptimistically(params: {
    expenseId: string;
    onOptimisticApplied: () => void;
    onRollback: () => void;
  }): Promise<boolean> {
    const { expenseId, onOptimisticApplied, onRollback } = params;
    onOptimisticApplied();
    try {
      await mutate(
        groupDetailKey,
        async (currentValue: GroupDetailApiPayload | undefined) => {
          const response = await fetch(`/api/groups/${groupId}/expenses/${expenseId}`, {
            method: "DELETE",
          });
          if (!response.ok) {
            throw new Error("delete_failed");
          }
          return removeExpenseFromCache(currentValue, expenseId);
        },
        {
          optimisticData: (currentValue: GroupDetailApiPayload | undefined) =>
            removeExpenseFromCache(currentValue, expenseId),
          rollbackOnError: true,
          revalidate: false,
        },
      );
      return true;
    } catch {
      onRollback();
      return false;
    } finally {
      void mutate(groupDetailKey);
    }
  }

  async function markSettlementOptimistically(params: {
    fromUserId: string;
    toUserId: string;
    amount: number;
    onOptimisticApplied: () => void;
    onRollback: () => void;
  }): Promise<boolean> {
    const { fromUserId, toUserId, amount, onOptimisticApplied, onRollback } =
      params;
    const optimisticMarkedAt = new Date().toISOString();
    onOptimisticApplied();
    try {
      await mutate(
        groupDetailKey,
        async (currentValue: GroupDetailApiPayload | undefined) => {
          const response = await fetch(
            `/api/groups/${groupId}/settlement-transactions`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                from_user_id: fromUserId,
                to_user_id: toUserId,
                amount,
              }),
            },
          );
          if (!response.ok) {
            throw new Error("mark_paid_failed");
          }
          const body = (await response.json()) as { marked_at?: string };
          return markSettlementPaidInCache(
            currentValue,
            fromUserId,
            toUserId,
            body.marked_at ?? optimisticMarkedAt,
          );
        },
        {
          optimisticData: (currentValue: GroupDetailApiPayload | undefined) =>
            markSettlementPaidInCache(
              currentValue,
              fromUserId,
              toUserId,
              optimisticMarkedAt,
            ),
          rollbackOnError: true,
          revalidate: false,
        },
      );
      return true;
    } catch {
      onRollback();
      return false;
    } finally {
      void mutate(groupDetailKey);
      void mutate("/api/dashboard/stats");
    }
  }

  return {
    deleteExpenseOptimistically,
    markSettlementOptimistically,
  };
}
