"use client";

import { mutate } from "swr";

type GroupDetailApiPayload = {
  data?: {
    expenses?: Array<{ id: string }>;
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
    rowKey: string;
    onOptimisticApplied: () => void;
    onRollback: () => void;
  }): Promise<boolean> {
    const { rowKey, onOptimisticApplied, onRollback } = params;
    void rowKey;
    onOptimisticApplied();
    try {
      await mutate(
        groupDetailKey,
        async () => {
          const response = await fetch(groupDetailKey, { method: "GET" });
          if (!response.ok) {
            throw new Error("group_refresh_failed");
          }
          return (await response.json()) as GroupDetailApiPayload;
        },
        {
          optimisticData: (currentValue: GroupDetailApiPayload | undefined) =>
            currentValue ?? {},
          rollbackOnError: true,
          revalidate: false,
        },
      );
      return true;
    } catch {
      onRollback();
      return false;
    }
  }

  return {
    deleteExpenseOptimistically,
    markSettlementOptimistically,
  };
}
