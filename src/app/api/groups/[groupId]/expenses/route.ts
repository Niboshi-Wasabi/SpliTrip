/**
 * Insert `group_expenses` plus `expense_splits` using shared split math.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  buildExpenseSplitRows,
  parseRemainderPolicy,
  type SplitMode,
} from "@/lib/group-expense-split-server";
import { mapSplitModeToDatabaseEnum } from "@/lib/map-split-mode";
import { parseExpenseCategoryId } from "@/lib/expense-categories";
import { fetchGroupDetailForUser } from "@/lib/group-queries";
import { createClient } from "@/utils/supabase/server";

type RouteContext = { params: Promise<{ groupId: string }> };

const RECEIPT_MAX_BYTES = 4_500_000;
const INTERNAL_SERVER_ERROR_MESSAGE =
  "サーバーで予期せぬエラーが発生しました。";

const ALLOWED_RECEIPT_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

type ExpenseBody = {
  payer_id?: string;
  amount?: unknown;
  description?: unknown;
  expense_date?: unknown;
  category?: unknown;
  receipt_base64?: unknown;
  receipt_mime_type?: unknown;
  split_mode?: unknown;
  remainder_policy?: unknown;
  manual_splits?: unknown;
  share_inputs?: unknown;
  percent_inputs?: unknown;
  itemized_lines?: unknown;
};

function fileExtensionForReceiptMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "bin";
}

/** PostgREST が RPC のオーバーロードを解決できないとき（未適用マイグレーション等）。 */
function isPostgrestRpcFunctionMissingError(message: string | undefined): boolean {
  if (!message) return false;
  return (
    message.includes("Could not find the function") ||
    (message.includes("schema cache") && message.includes("function"))
  );
}

function stripBase64DataUrlPrefix(raw: string): string {
  const commaIndex = raw.indexOf(",");
  if (raw.startsWith("data:") && commaIndex !== -1) {
    return raw.slice(commaIndex + 1);
  }
  return raw;
}

function parseSplitMode(raw: unknown): SplitMode {
  const normalizedMode = String(raw ?? "equal").toLowerCase();
  if (normalizedMode === "manual" || normalizedMode === "exact") {
    return "exact";
  }
  if (normalizedMode === "shares" || normalizedMode === "share") {
    return "shares";
  }
  if (normalizedMode === "percent" || normalizedMode === "percentage" || normalizedMode === "percentages") {
    return "percent";
  }
  if (normalizedMode === "itemized") {
    return "itemized";
  }
  return "equal";
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { groupId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const detail = await fetchGroupDetailForUser(supabase, groupId, user.id);
  if (!detail.ok) {
    if (detail.error === "forbidden") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (detail.error === "group_not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    console.error("[API/Action Error - POST /api/groups/[groupId]/expenses detail lookup]:", {
      groupId,
      userId: user.id,
      lookupError: detail.error,
    });
    return NextResponse.json(
      { error: "group_lookup_failed", message: INTERNAL_SERVER_ERROR_MESSAGE },
      { status: 500 },
    );
  }

  const memberUserIdsOrdered = detail.data.members.map((member) => member.user_id);
  const memberIds = new Set(memberUserIdsOrdered);

  const parsed: unknown = await request.json().catch(() => null);
  if (parsed === null || typeof parsed !== "object" || parsed === null) {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const body = parsed as ExpenseBody;
  const payer_id = String(body.payer_id ?? "");
  const amount = Number(body.amount);
  const description =
    body.description === undefined || body.description === null
      ? null
      : String(body.description);
  const expense_date = String(body.expense_date ?? "").trim();
  const category = parseExpenseCategoryId(body.category);
  const receiptBase64Raw =
    typeof body.receipt_base64 === "string" ? body.receipt_base64.trim() : "";
  const receiptMimeRaw =
    typeof body.receipt_mime_type === "string"
      ? body.receipt_mime_type.trim().toLowerCase()
      : "";
  const splitMode = parseSplitMode(body.split_mode);
  const currencyCode = detail.data.group.currency_code;
  const policy = parseRemainderPolicy(
    body.remainder_policy,
    payer_id,
    memberIds,
  );

  if (!payer_id || !memberIds.has(payer_id)) {
    return NextResponse.json({ error: "invalid_payer" }, { status: 400 });
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }

  const dateStr =
    expense_date.length > 0 ? expense_date : new Date().toISOString().slice(0, 10);

  const built = buildExpenseSplitRows({
    splitMode,
    amount,
    currencyCode,
    memberUserIds: memberUserIdsOrdered,
    memberIds,
    payerId: payer_id,
    policy,
    body,
  });

  if (!built.ok) {
    return NextResponse.json({ error: built.error }, { status: 400 });
  }

  const splitRows = built.splitRows;

  const splitsJson = splitRows.map((split) => ({
    user_id: split.user_id,
    amount: split.amount,
    ratio: split.ratio,
  }));

  const splitTypeEnum = mapSplitModeToDatabaseEnum(splitMode);

  /** 062300: category + receipt_url。061300 より後のマイグレーション適用済み想定。 */
  const insertPayloadLegacy = {
    p_group_id: groupId,
    p_payer_id: payer_id,
    p_amount: amount,
    p_description: description,
    p_expense_date: dateStr,
    p_splits: splitsJson,
    p_category: category,
    p_receipt_url: null as string | null,
  };

  /** 061300: 6 引数のみ。本番が古い場合の最終フォールバック。 */
  const insertPayloadMinimal = {
    p_group_id: groupId,
    p_payer_id: payer_id,
    p_amount: amount,
    p_description: description,
    p_expense_date: dateStr,
    p_splits: splitsJson,
  };

  let expenseIdResult = await supabase.rpc("insert_expense_with_splits", {
    ...insertPayloadLegacy,
    p_split_type: splitTypeEnum,
  });

  if (
    expenseIdResult.error &&
    isPostgrestRpcFunctionMissingError(expenseIdResult.error.message)
  ) {
    expenseIdResult = await supabase.rpc(
      "insert_expense_with_splits",
      insertPayloadLegacy,
    );
  }

  if (
    expenseIdResult.error &&
    isPostgrestRpcFunctionMissingError(expenseIdResult.error.message)
  ) {
    const beforeMinimal = expenseIdResult.error?.message;
    expenseIdResult = await supabase.rpc(
      "insert_expense_with_splits",
      insertPayloadMinimal,
    );
    if (!expenseIdResult.error) {
      console.warn(
        "insert_expense_with_splits: used 6-arg RPC fallback; apply migrations 20260406230000+ for category/receipt/split_type",
        { groupId, priorError: beforeMinimal },
      );
    }
  }

  const { data: expenseId, error: rpcError } = expenseIdResult;

  if (rpcError || !expenseId) {
    console.error("[API/Action Error - POST /api/groups/[groupId]/expenses RPC insert]:", {
      rpcError,
      groupId,
      payerId: payer_id,
      splitMode,
    });
    if (isPostgrestRpcFunctionMissingError(rpcError?.message)) {
      return NextResponse.json(
        { error: "expense_insert_failed", message: INTERNAL_SERVER_ERROR_MESSAGE },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "expense_insert_failed", message: INTERNAL_SERVER_ERROR_MESSAGE },
      { status: 500 },
    );
  }

  let receiptUploaded = false;
  let receiptUploadError: string | null = null;

  if (receiptBase64Raw.length > 0) {
    if (!ALLOWED_RECEIPT_MIMES.has(receiptMimeRaw)) {
      receiptUploadError = "invalid_receipt_mime";
    } else {
      let buffer: Buffer;
      try {
        buffer = Buffer.from(stripBase64DataUrlPrefix(receiptBase64Raw), "base64");
      } catch {
        receiptUploadError = "invalid_receipt_encoding";
        buffer = Buffer.alloc(0);
      }

      if (receiptUploadError === null) {
        if (buffer.length === 0 || buffer.length > RECEIPT_MAX_BYTES) {
          receiptUploadError = "receipt_too_large";
        } else {
          const extension = fileExtensionForReceiptMime(receiptMimeRaw);
          const objectPath = `${groupId}/${String(expenseId)}/${Date.now()}.${extension}`;
          const { error: uploadError } = await supabase.storage
            .from("receipts")
            .upload(objectPath, buffer, {
              contentType: receiptMimeRaw,
              upsert: false,
            });

          if (uploadError) {
            console.error(
              "[API/Action Error - POST /api/groups/[groupId]/expenses receipt upload]:",
              uploadError,
            );
            receiptUploadError = "receipt_upload_failed";
          } else {
            const { error: linkError } = await supabase
              .from("group_expenses")
              .update({ receipt_url: objectPath })
              .eq("id", expenseId)
              .eq("group_id", groupId);

            if (linkError) {
              console.error(
                "[API/Action Error - POST /api/groups/[groupId]/expenses receipt link]:",
                linkError,
              );
              receiptUploadError = "receipt_link_failed";
            } else {
              receiptUploaded = true;
            }
          }
        }
      }
    }
  }

  return NextResponse.json(
    {
      expense_id: expenseId,
      receipt_uploaded: receiptUploaded,
      receipt_error: receiptUploadError,
    },
    { status: 201 },
  );
}
