/**
 * Supabase reads for Warika-style groups: membership, expenses, settlements, payment handles.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeGroupSettlements,
  type ExpenseWithSplits,
  type GroupSettlement,
} from "@/lib/group-ledger";

export type GroupRow = {
  id: string;
  name: string;
  currency_code: string;
  created_by: string;
  created_at: string;
  invite_token: string;
};

export type GroupMemberRow = {
  user_id: string;
  role: string;
  display_name: string;
  avatar_url: string | null;
  paypal_me_id: string | null;
  cash_app_cashtag: string | null;
};

export type SplitRow = {
  user_id: string;
  amount: string | number;
  ratio: string | number;
};

export type ExpenseRowDb = {
  id: string;
  payer_id: string;
  amount: string | number;
  description: string | null;
  expense_date: string;
  expense_splits: SplitRow[] | null;
};

/** Map a DB expense row (+ nested splits) into the ledger shape. */
function expenseRowToLedgerEntry(row: ExpenseRowDb): ExpenseWithSplits {
  return {
    payer_id: row.payer_id,
    amount: Number(row.amount),
    splits: (row.expense_splits ?? []).map((splitRow) => ({
      user_id: splitRow.user_id,
      amount: Number(splitRow.amount),
    })),
  };
}

export async function listGroupsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<
  | { ok: true; items: { group: GroupRow; role: string }[] }
  | { ok: false; error: string }
> {
  const { data: memberships, error: membershipError } = await supabase
    .from("group_members")
    .select("group_id, role")
    .eq("user_id", userId);

  if (membershipError) {
    console.error("listGroupsForUser:", membershipError.message);
    return { ok: false, error: membershipError.message };
  }

  const distinctGroupIds = [
    ...new Set(
      (memberships ?? []).map(
        (membershipRow) => membershipRow.group_id as string,
      ),
    ),
  ];
  if (distinctGroupIds.length === 0) {
    return { ok: true, items: [] };
  }

  const { data: groups, error: groupsError } = await supabase
    .from("groups")
    .select("id, name, currency_code, created_by, created_at, invite_token")
    .in("id", distinctGroupIds);

  if (groupsError) {
    console.error("listGroupsForUser groups:", groupsError.message);
    return { ok: false, error: groupsError.message };
  }

  const roleByGroupId = new Map(
    (memberships ?? []).map((membershipRow) => [
      membershipRow.group_id as string,
      membershipRow.role as string,
    ]),
  );

  const items = (groups ?? []).map((groupRow) => ({
    group: groupRow as GroupRow,
    role: roleByGroupId.get(groupRow.id as string) ?? "member",
  }));

  return { ok: true, items };
}

export type GroupDetail = {
  group: GroupRow;
  members: GroupMemberRow[];
  expenses: ExpenseRowDb[];
  settlements: GroupSettlement[];
};

/**
 * Full group payload for a member; returns forbidden / not_found codes for RSC routes.
 */
export async function fetchGroupDetailForUser(
  supabase: SupabaseClient,
  groupId: string,
  userId: string,
): Promise<{ ok: true; data: GroupDetail } | { ok: false; error: string }> {
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id, name, currency_code, created_by, created_at, invite_token")
    .eq("id", groupId)
    .maybeSingle();

  if (groupError) {
    console.error("fetchGroup group:", groupError.message, { groupId, userId });
    return { ok: false, error: groupError.message };
  }

  if (!group) {
    console.error("fetchGroup group_not_found", { groupId, userId });
    return { ok: false, error: "group_not_found" };
  }

  const { data: memberRows, error: membersError } = await supabase
    .from("group_members")
    .select("user_id, role")
    .eq("group_id", groupId);

  if (membersError) {
    console.error("fetchGroup members:", membersError.message, { groupId, userId });
    return { ok: false, error: membersError.message };
  }

  const membersList = memberRows ?? [];
  const memberUserIds = membersList.map((memberRow) => memberRow.user_id);
  const viewerIsMember = memberUserIds.includes(userId);
  if (!viewerIsMember) {
    console.error("fetchGroup forbidden", {
      groupId,
      userId,
      memberCount: membersList.length,
      memberUserIds,
    });
    return { ok: false, error: "forbidden" };
  }

  const { data: profilesRaw, error: profilesError } = await supabase.rpc(
    "get_group_member_profiles",
    { p_group_id: groupId },
  );

  if (profilesError) {
    console.error("fetchGroup profiles (non-fatal):", profilesError.message);
  }

  type ProfileRow = {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    paypal_me_id: string | null;
    cash_app_cashtag: string | null;
  };
  const profiles = (profilesRaw ?? []) as ProfileRow[];

  const displayNameByUserId: Record<string, string> = {};
  const avatarUrlByUserId: Record<string, string | null> = {};
  const paymentFieldsByUserId: Record<
    string,
    { paypal_me_id: string | null; cash_app_cashtag: string | null }
  > = {};
  for (const profileRow of profiles) {
    displayNameByUserId[profileRow.id] =
      profileRow.display_name?.trim() || "ユーザー";
    avatarUrlByUserId[profileRow.id] =
      typeof profileRow.avatar_url === "string" &&
      profileRow.avatar_url.trim()
        ? profileRow.avatar_url.trim()
        : null;
    paymentFieldsByUserId[profileRow.id] = {
      paypal_me_id:
        typeof profileRow.paypal_me_id === "string" &&
        profileRow.paypal_me_id.trim()
          ? profileRow.paypal_me_id.trim()
          : null,
      cash_app_cashtag:
        typeof profileRow.cash_app_cashtag === "string" &&
        profileRow.cash_app_cashtag.trim()
          ? profileRow.cash_app_cashtag.trim()
          : null,
    };
  }

  const { data: expenseRows, error: expensesError } = await supabase
    .from("group_expenses")
    .select(
      `
      id,
      payer_id,
      amount,
      description,
      expense_date,
      expense_splits ( user_id, amount, ratio )
    `,
    )
    .eq("group_id", groupId)
    .order("expense_date", { ascending: false });

  if (expensesError) {
    console.error("fetchGroup expenses (non-fatal):", expensesError.message, {
      groupId,
      userId,
    });
  }

  const expensesTyped = (expenseRows ?? []) as unknown as ExpenseRowDb[];
  const ledgerEntries: ExpenseWithSplits[] =
    expensesTyped.map(expenseRowToLedgerEntry);
  const settlements = computeGroupSettlements(
    ledgerEntries,
    displayNameByUserId,
  );

  const members: GroupMemberRow[] = membersList.map((memberRow) => {
    const payment = paymentFieldsByUserId[memberRow.user_id];
    return {
      user_id: memberRow.user_id,
      role: memberRow.role,
      display_name:
        displayNameByUserId[memberRow.user_id] ?? "ユーザー",
      avatar_url: avatarUrlByUserId[memberRow.user_id] ?? null,
      paypal_me_id: payment?.paypal_me_id ?? null,
      cash_app_cashtag: payment?.cash_app_cashtag ?? null,
    };
  });

  return {
    ok: true,
    data: {
      group: group as GroupRow,
      members,
      expenses: expensesTyped,
      settlements,
    },
  };
}
