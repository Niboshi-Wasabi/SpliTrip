"use server";

/**
 * Server Action: Gemini でレシート/スクショから出費情報を抽出する。
 * 無料枠は成功ごとに `ocr_usage_count` を加算（PRO は無制限）。
 */

import { GoogleGenAI } from "@google/genai";
import {
  hasPremiumAccess,
  isOcrBlockedForFreeTier,
  type PremiumProfileFields,
} from "@/lib/premium-access";
import { createClient } from "@/utils/supabase/server";

export type ReceiptData = {
  amount: number;
  description: string;
  date: string;
};

export type AnalyzeReceiptErrorCode =
  | "GEMINI_CONFIG"
  | "AUTH"
  | "OCR_LIMIT"
  | "GEMINI";

type AnalyzeReceiptResult =
  | { data: ReceiptData; error: null }
  | {
      data: null;
      error: string;
      code: AnalyzeReceiptErrorCode;
    };

const UNEXPECTED_SERVER_ERROR_MESSAGE =
  "サーバーで予期せぬエラーが発生しました。";
const ANALYZE_RECEIPT_FAILED_MESSAGE =
  "画像の読み取りに失敗しました。";
const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

function parseProfileJson(
  raw: unknown,
): PremiumProfileFields & Record<string, unknown> {
  if (raw === null || typeof raw !== "object") {
    return { premium_access: false, ocr_usage_count: 0 };
  }
  const record = raw as Record<string, unknown>;
  return {
    premium_access: record.premium_access === true,
    ocr_usage_count:
      typeof record.ocr_usage_count === "number" ? record.ocr_usage_count : 0,
    ...record,
  };
}

/**
 * レシート画像から金額・説明・日付を Gemini で抽出する。
 *
 * @param base64Image - data URI のプレフィックスを除いた純粋な base64 文字列
 * @param mimeType    - "image/jpeg" | "image/png" | "image/webp" 等
 */
export async function analyzeReceipt(
  base64Image: string,
  mimeType: string,
): Promise<AnalyzeReceiptResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      data: null,
      error: "ログインが必要です。",
      code: "AUTH",
    };
  }

  const { data: profileJson, error: profileError } =
    await supabase.rpc("get_own_profile");
  if (profileError) {
    console.error(
      "[API/Action Error - analyzeReceipt get_own_profile]:",
      profileError,
    );
  }

  const profile = parseProfileJson(profileJson);

  if (!hasPremiumAccess(profile) && isOcrBlockedForFreeTier(profile)) {
    return {
      data: null,
      error: "OCR limit reached",
      code: "OCR_LIMIT",
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = (process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL).trim();
  if (!apiKey) {
    return {
      data: null,
      error: "現在この機能は利用できません。",
      code: "GEMINI_CONFIG",
    };
  }
  if (!modelName) {
    return {
      data: null,
      error: "現在この機能は利用できません。",
      code: "GEMINI_CONFIG",
    };
  }

  const MAX_BASE64_LENGTH = 4 * 1024 * 1024;
  if (base64Image.length > MAX_BASE64_LENGTH) {
    return {
      data: null,
      error: ANALYZE_RECEIPT_FAILED_MESSAGE,
      code: "GEMINI",
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  const todayIso = new Date().toISOString().slice(0, 10);

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: [
                "You are a receipt / screenshot parser.",
                "Extract the following from the provided image:",
                "- amount: total payment amount as a number (no currency symbols, no commas)",
                "- description: store name, shop name, or a short summary of items",
                "- date: payment date in YYYY-MM-DD format",
                "",
                "Rules:",
                `- If the date is unclear or missing, use today: ${todayIso}`,
                "- If the amount is unclear, set it to 0",
                "- If the description is unclear, set it to an empty string",
                "- Return ONLY a valid JSON object with keys: amount, description, date",
              ].join("\n"),
            },
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text ?? "";
    if (!rawText.trim()) {
      return {
        data: null,
        error: ANALYZE_RECEIPT_FAILED_MESSAGE,
        code: "GEMINI",
      };
    }

    const parsed: unknown = JSON.parse(rawText);
    if (typeof parsed !== "object" || parsed === null) {
      return {
        data: null,
        error: ANALYZE_RECEIPT_FAILED_MESSAGE,
        code: "GEMINI",
      };
    }

    const record = parsed as Record<string, unknown>;

    const receiptData: ReceiptData = {
      amount: Number(record.amount) || 0,
      description: String(record.description ?? ""),
      date:
        typeof record.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(record.date)
          ? record.date
          : todayIso,
    };

    if (!hasPremiumAccess(profile)) {
      const { error: incrementError } = await supabase.rpc(
        "increment_ocr_usage_if_not_premium",
      );
      if (incrementError) {
        console.error(
          "[API/Action Error - analyzeReceipt increment_ocr_usage_if_not_premium]:",
          incrementError,
        );
      }
    }

    return {
      data: receiptData,
      error: null,
    };
  } catch (caughtError) {
    console.error(
      "[API/Action Error - analyzeReceipt Gemini inference]:",
      caughtError,
    );
    return {
      data: null,
      error: UNEXPECTED_SERVER_ERROR_MESSAGE,
      code: "GEMINI",
    };
  }
}
