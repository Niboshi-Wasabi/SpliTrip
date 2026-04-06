/**
 * Supabase reads for Warika-style groups: membership, expenses, settlements, payment handles.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExpenseCategoryId } from "@/lib/expense-categories";
import type { PaymentLinkStored } from "@/lib/database.types";
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
  /** Read-only share token for `/groups/[id]/shared` (optional until migration applied). */
  public_share_token?: string;
};

export type GroupMemberRow = {
  user_id: string;
  role: string;
  display_name: string;
  avatar_url: string | null;
  paypal_me_id: string | null;
  cash_app_cashtag: string | null;
  /** Extra settlement URLs from `user_profiles.payment_links` (JSON array). */
  payment_links: PaymentLinkStored[] | null;
  /** True for anonymous / lightweight guest accounts when flagged in DB. */
  is_guest: boolean;
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
  category: ExpenseCategoryId;
  receipt_url: string | null;
  expense_splits: SplitRow[] | null;
  split_type?: string | null;
};

export type ExpenseAuditLogRow = {
  id: string;
  expense_id: string | null;
  actor_id: string | null;
  action: "insert" | "update" | "delete";
  payload: unknown;
  created_at: string;
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
    .select(
      "id, name, currency_code, created_by, created_at, invite_token",
    )
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
    payment_links: unknown;
    is_guest: boolean;
  };
  const profiles = (profilesRaw ?? []) as ProfileRow[];

  const displayNameByUserId: Record<string, string> = {};
  const avatarUrlByUserId: Record<string, string | null> = {};
  const paymentFieldsByUserId: Record<
    string,
    {
      paypal_me_id: string | null;
      cash_app_cashtag: string | null;
      payment_links: PaymentLinkStored[] | null;
    }
  > = {};
  for (const profileRow of profiles) {
    displayNameByUserId[profileRow.id] =
      profileRow.display_name?.trim() || "ユーザー";
    avatarUrlByUserId[profileRow.id] =
      typeof profileRow.avatar_url === "string" &&
      profileRow.avatar_url.trim()
        ? profileRow.avatar_url.trim()
        : null;
    const linksFromProfile = Array.isArray(profileRow.payment_links)
      ? (profileRow.payment_links as PaymentLinkStored[])
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
      payment_links: linksFromProfile,
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
      category,
      receipt_url,
      split_type,
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

  const expensesTyped = (expenseRows ?? []).map((rawRow) => {
    const row = rawRow as Record<string, unknown>;
    return {
      ...row,
      category:
        typeof row.category === "string" && row.category.trim() !== ""
          ? row.category
          : "other",
      receipt_url:
        typeof row.receipt_url === "string" && row.receipt_url.trim() !== ""
          ? row.receipt_url.trim()
          : null,
    } as ExpenseRowDb;
  });
  const ledgerEntries: ExpenseWithSplits[] =
    expensesTyped.map(expenseRowToLedgerEntry);
  const settlements = computeGroupSettlements(
    ledgerEntries,
    displayNameByUserId,
  );

  const members: GroupMemberRow[] = membersList.map((memberRow) => {
    const payment = paymentFieldsByUserId[memberRow.user_id];
    const profileRow = profiles.find((profile) => profile.id === memberRow.user_id);
    return {
      user_id: memberRow.user_id,
      role: memberRow.role,
      display_name:
        displayNameByUserId[memberRow.user_id] ?? "ユーザー",
      avatar_url: avatarUrlByUserId[memberRow.user_id] ?? null,
      paypal_me_id: payment?.paypal_me_id ?? null,
      cash_app_cashtag: payment?.cash_app_cashtag ?? null,
      payment_links: payment?.payment_links ?? null,
      is_guest: profileRow?.is_guest ?? false,
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
