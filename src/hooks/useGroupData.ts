"use client";

import { useMemo } from "react";
import { useSWRWithRealtime } from "./useSWRWithRealtime";

/**
 * グループデータの高度な管理フック
 * - リアルタイム同期
 * - 自動的なキャッシュ更新
 * - 最適化されたデータフェッチング
 */

export function useGroupDetails(groupId: string | null, currentUserId?: string) {
  return useSWRWithRealtime(
    groupId ? `/api/groups/${groupId}` : null,
    {
      realtimeConfig: groupId ? [
        { table: "groups", filter: `id=eq."${groupId}"` },
      ] : [],
      currentUserId,
      broadcastChannel: groupId ? `group:${groupId}:details` : undefined,
    }
  );
}

export function useGroupMembers(groupId: string | null, currentUserId?: string) {
  return useSWRWithRealtime(
    groupId ? `/api/groups/${groupId}/members` : null,
    {
      realtimeConfig: groupId ? [
        { table: "group_members", filter: `group_id=eq."${groupId}"` },
      ] : [],
      currentUserId,
      broadcastChannel: groupId ? `group:${groupId}:members` : undefined,
    }
  );
}

export function useGroupExpenses(groupId: string | null, currentUserId?: string) {
  return useSWRWithRealtime(
    groupId ? `/api/groups/${groupId}/expenses` : null,
    {
      realtimeConfig: groupId ? [
        { table: "group_expenses", filter: `group_id=eq."${groupId}"` },
      ] : [],
      currentUserId,
      broadcastChannel: groupId ? `group:${groupId}:expenses` : undefined,
      debounceMs: 100, // 出費の変更は頻繁なので短めのデバウンス
    }
  );
}

export function useGroupFullData(groupId: string | null, currentUserId?: string) {
  const detailsResult = useGroupDetails(groupId, currentUserId);
  const membersResult = useGroupMembers(groupId, currentUserId);
  const expensesResult = useGroupExpenses(groupId, currentUserId);

  const combinedData = useMemo(() => {
    const group = detailsResult.data?.group;
    const members = membersResult.data?.members || [];
    const expenses = expensesResult.data?.expenses || [];

    if (!group) {
      return null;
    }

    // 統計の計算
    const totalExpenses = expenses.reduce(
      (sum: number, expense: any) => sum + (expense.amount || 0), 
      0
    );
    const avgPerMember = members.length > 0 ? totalExpenses / members.length : 0;

    // カテゴリー別統計
    const categoryTotals = new Map<string, number>();
    expenses.forEach((expense: any) => {
      const categoryId = expense.category_id || "other";
      categoryTotals.set(categoryId, (categoryTotals.get(categoryId) || 0) + (expense.amount || 0));
    });

    return {
      group,
      members,
      expenses,
      stats: {
        totalExpenses,
        avgPerMember,
        memberCount: members.length,
        expenseCount: expenses.length,
        categoryTotals,
      },
    };
  }, [detailsResult.data, membersResult.data, expensesResult.data]);

  return {
    data: combinedData,
    error: detailsResult.error || membersResult.error || expensesResult.error,
    isLoading: detailsResult.isLoading || membersResult.isLoading || expensesResult.isLoading,
    mutate: () => {
      detailsResult.mutate();
      membersResult.mutate();
      expensesResult.mutate();
    },
    triggerSync: () => {
      detailsResult.triggerSync?.();
      membersResult.triggerSync?.();
      expensesResult.triggerSync?.();
    },
  };
}