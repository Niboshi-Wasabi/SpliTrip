import { createClient } from "@/utils/supabase/server";
import { getCategoryColor } from "./categories";
import { computeSettlements, type Settlement } from "./settlements";

export interface CategoryExpense {
  category: string;
  amount: number;
  color: string;
}

export interface MemberSummary {
  id: string;
  name: string;
  avatar: string;
  paid: number;
  owed: number;
}

export interface DashboardData {
  tripName: string;
  categories: CategoryExpense[];
  members: MemberSummary[];
  settlements: Settlement[];
  totalExpense: number;
  perPerson: number;
  /** Supabase の匿名サインイン（signInAnonymously）利用中 */
  isGuestMode: boolean;
}

const DEFAULT_CATEGORY = "その他";
const DEFAULT_MEMBER_NAME = "名無し";
const DEFAULT_TRIP_NAME = "旅行";
const NO_TRIP_LABEL = "旅行なし";
const MIN_MEMBER_DIVISOR = 1;

const EMPTY_DASHBOARD: DashboardData = {
  tripName: NO_TRIP_LABEL,
  categories: [],
  members: [],
  settlements: [],
  totalExpense: 0,
  perPerson: 0,
  isGuestMode: false,
};

export async function fetchDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("[API/Action Error - fetchDashboardData getUser]:", userError);
    throw new Error("unauthorized");
  }

  if (!user) {
    throw new Error("unauthorized");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("trip_members")
    .select("trip_id")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    console.error(
      "[API/Action Error - fetchDashboardData trip_members (non-fatal)]:",
      membershipError,
    );
    return {
      ...EMPTY_DASHBOARD,
      isGuestMode: user.is_anonymous === true,
    };
  }

  if (!membership) {
    return {
      ...EMPTY_DASHBOARD,
      isGuestMode: user.is_anonymous === true,
    };
  }

  const tripId = membership.trip_id;

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("name")
    .eq("id", tripId)
    .single();

  if (tripError) {
    console.error(
      "[API/Action Error - fetchDashboardData trips]:",
      tripError,
    );
  }

  const { data: memberRows, error: membersError } = await supabase
    .from("trip_members")
    .select("user_id")
    .eq("trip_id", tripId);

  if (membersError) {
    console.error(
      "[API/Action Error - fetchDashboardData trip_members list (non-fatal)]:",
      membersError,
    );
    return {
      ...EMPTY_DASHBOARD,
      tripName: trip?.name ?? DEFAULT_TRIP_NAME,
      isGuestMode: user.is_anonymous === true,
    };
  }

  const userIdsOrdered: string[] = [];
  const seenUserIds = new Set<string>();
  for (const memberRow of memberRows ?? []) {
    if (!seenUserIds.has(memberRow.user_id)) {
      seenUserIds.add(memberRow.user_id);
      userIdsOrdered.push(memberRow.user_id);
    }
  }
  const userIds = userIdsOrdered;

  type ProfileRow = {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };

  let profileByUserId = new Map<string, ProfileRow>();

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);

    if (profilesError) {
      console.error(
        "[API/Action Error - fetchDashboardData user_profiles (non-fatal)]:",
        profilesError,
      );
    }

    profileByUserId = new Map(
      (profiles ?? []).map((profile) => [profile.id, profile]),
    );
  }

  const members = userIds.map((userId) => {
    const profile = profileByUserId.get(userId);
    return {
      id: userId,
      name: profile?.display_name ?? DEFAULT_MEMBER_NAME,
      avatarUrl: profile?.avatar_url,
    };
  });

  const nameMap: Record<string, string> = {};
  for (const member of members) {
    nameMap[member.id] = member.name;
  }

  const { data: expenses, error: expensesError } = await supabase
    .from("expenses")
    .select("category, amount, payer_id")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });

  if (expensesError) {
    console.error(
      "[API/Action Error - fetchDashboardData expenses (non-fatal)]:",
      expensesError,
    );
  }

  const expenseRows = expenses ?? [];
  const memberCount = members.length || MIN_MEMBER_DIVISOR;

  const categoryTotals = new Map<string, number>();
  for (const expense of expenseRows) {
    const categoryName = expense.category || DEFAULT_CATEGORY;
    categoryTotals.set(
      categoryName,
      (categoryTotals.get(categoryName) ?? 0) + Number(expense.amount),
    );
  }

  const categories: CategoryExpense[] = [...categoryTotals.entries()]
    .sort(
      ([, amountLeft], [, amountRight]) => amountRight - amountLeft,
    )
    .map(([category, amount], index) => ({
      category,
      amount,
      color: getCategoryColor(category, index),
    }));

  const totalExpense = categories.reduce(
    (sum, categoryExpense) => sum + categoryExpense.amount,
    0,
  );
  const perPerson = Math.round(totalExpense / memberCount);

  const paidByMember = new Map<string, number>();
  for (const expense of expenseRows) {
    paidByMember.set(
      expense.payer_id,
      (paidByMember.get(expense.payer_id) ?? 0) + Number(expense.amount),
    );
  }

  const memberSummaries: MemberSummary[] = members.map((member) => ({
    id: member.id,
    name: member.name,
    avatar: member.name.charAt(0),
    paid: paidByMember.get(member.id) ?? 0,
    owed: perPerson,
  }));

  const balances: Record<string, number> = {};
  for (const member of memberSummaries) {
    balances[member.id] = member.paid - member.owed;
  }
  const settlements = computeSettlements(balances, nameMap);

  return {
    tripName: trip?.name ?? DEFAULT_TRIP_NAME,
    categories,
    members: memberSummaries,
    settlements,
    totalExpense,
    perPerson,
    isGuestMode: user.is_anonymous === true,
  };
}
