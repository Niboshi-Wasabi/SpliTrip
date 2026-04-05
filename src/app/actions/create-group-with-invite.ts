"use server";

/**
 * Creates a split group and returns the invite token in the same round-trip
 * so the client can show a shareable link immediately after creation.
 * 割り勘グループを作成し、同一レスポンスで invite_token を返して作成直後に共有 URL を表示できるようにする。
 *
 * @param input - Display name and ISO currency code / グループ名と通貨コード
 * @returns Result with group id + token, or an error code / グループIDとトークン、またはエラーコード
 */
import { revalidatePath } from "next/cache";
import { withLocalePrefix } from "@/lib/i18n/localized-paths";
import { routing } from "@/i18n/routing";
import { createClient } from "@/utils/supabase/server";

const MIN_CURRENCY_CODE_LENGTH = 3;

export type CreateGroupWithInviteInput = {
  name: string;
  currencyCode: string;
};

export type CreateGroupWithInviteSuccess = {
  ok: true;
  groupId: string;
  inviteToken: string;
};

export type CreateGroupWithInviteFailure = {
  ok: false;
  errorCode: string;
  message?: string;
};

export type CreateGroupWithInviteResult =
  | CreateGroupWithInviteSuccess
  | CreateGroupWithInviteFailure;

type RpcGroupRow = {
  id: string;
  invite_token: string;
};

/**
 * Map Postgres exception text from `create_group_with_invite` to client error codes.
 * RPC が投げた例外文言をクライアント向けコードに寄せる。
 */
function errorCodeFromRpcMessage(message: string): string | null {
  if (message.includes("not_authenticated")) {
    return "unauthorized";
  }
  if (message.includes("name_required")) {
    return "name_required";
  }
  return null;
}

export async function createGroupWithInviteAction(
  input: CreateGroupWithInviteInput,
): Promise<CreateGroupWithInviteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, errorCode: "unauthorized" };
  }

  const trimmedName = input.name.trim();
  if (!trimmedName) {
    return { ok: false, errorCode: "name_required" };
  }

  const currencyRaw = input.currencyCode.trim().toUpperCase();
  const currency_code =
    currencyRaw.length >= MIN_CURRENCY_CODE_LENGTH
      ? currencyRaw.slice(0, MIN_CURRENCY_CODE_LENGTH)
      : "JPY";

  /**
   * Use DB RPC instead of direct `insert` so creation succeeds even when PostgREST RLS
   * evaluates `auth.uid()` differently from the app session (common with Server Actions).
   * 直接 insert ではなく RPC を使い、Server Actions で PostgREST の RLS が `auth.uid()` を取り違える場合でも作成できるようにする。
   *
   * Why SECURITY DEFINER in SQL: trusted insert with `created_by = auth.uid()` only; trigger still adds owner row.
   * 理由: SQL 側で definer 実行としつつ `created_by` は必ず `auth.uid()`。トリガーで owner 行も付く。
   */
  const { data: rpcRows, error: rpcError } = await supabase.rpc(
    "create_group_with_invite",
    {
      p_name: trimmedName,
      p_currency: currency_code,
    },
  );

  if (rpcError) {
    console.error("createGroupWithInviteAction:", rpcError.message);
    const mapped = errorCodeFromRpcMessage(rpcError.message);
    if (mapped) {
      return { ok: false, errorCode: mapped, message: rpcError.message };
    }
    return {
      ok: false,
      errorCode: "insert_failed",
      message: rpcError.message,
    };
  }

  const groupRow = Array.isArray(rpcRows)
    ? (rpcRows[0] as RpcGroupRow | undefined)
    : (rpcRows as RpcGroupRow | null);

  if (!groupRow?.id || !groupRow.invite_token) {
    return { ok: false, errorCode: "invalid_response" };
  }

  // Refresh dashboard lists for every locale (prefix differs for non-default).
  // ロケールごとにプレフィックスが異なるため、全ロケールのダッシュボードを再検証する。
  for (const loc of routing.locales) {
    revalidatePath(withLocalePrefix(loc, "/dashboard"));
    revalidatePath(withLocalePrefix(loc, "/dashboard/groups"));
  }

  return {
    ok: true,
    groupId: String(groupRow.id),
    inviteToken: String(groupRow.invite_token),
  };
}
