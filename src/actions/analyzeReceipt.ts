"use server";

/**
 * Server Action: Gemini 1.5 Flash でレシート/スクショから出費情報を抽出する。
 * Server Action: Extract expense info from receipt/screenshot via Gemini 1.5 Flash.
 *
 * 自動保存せず、抽出結果をクライアントに返してフォームにセットさせる。
 * Does NOT auto-save; returns extracted data for the client to populate the form.
 */

import { GoogleGenAI } from "@google/genai";

export type ReceiptData = {
  amount: number;
  description: string;
  date: string;
};

type AnalyzeReceiptResult =
  | { data: ReceiptData; error: null }
  | { data: null; error: string };

/**
 * レシート画像から金額・説明・日付を Gemini で抽出する。
 * Extract amount, description, and date from a receipt image using Gemini.
 *
 * @param base64Image - data URI のプレフィックスを除いた純粋な base64 文字列
 *                      Pure base64 string without the data URI prefix.
 * @param mimeType    - "image/jpeg" | "image/png" | "image/webp" 等
 */
export async function analyzeReceipt(
  base64Image: string,
  mimeType: string,
): Promise<AnalyzeReceiptResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { data: null, error: "GEMINI_API_KEY is not configured" };
  }

  // 画像サイズの上限チェック（base64 で約 4MB = 約 3MB の実画像）
  // Guard against oversized payloads (~4MB base64 ≈ ~3MB raw image)
  const MAX_BASE64_LENGTH = 4 * 1024 * 1024;
  if (base64Image.length > MAX_BASE64_LENGTH) {
    return { data: null, error: "Image too large (max ~3MB)" };
  }

  const ai = new GoogleGenAI({ apiKey });

  const todayIso = new Date().toISOString().slice(0, 10);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
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
        // JSON 形式で返却させることでパース失敗を防ぐ
        // Force JSON output to avoid parsing issues
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text ?? "";
    if (!rawText.trim()) {
      return { data: null, error: "Empty response from Gemini" };
    }

    const parsed: unknown = JSON.parse(rawText);
    if (typeof parsed !== "object" || parsed === null) {
      return { data: null, error: "Unexpected response format" };
    }

    const record = parsed as Record<string, unknown>;

    return {
      data: {
        amount: Number(record.amount) || 0,
        description: String(record.description ?? ""),
        date: typeof record.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(record.date)
          ? record.date
          : todayIso,
      },
      error: null,
    };
  } catch (caughtError) {
    const errorMessage =
      caughtError instanceof Error ? caughtError.message : "Unknown error";
    console.error("analyzeReceipt Gemini API error:", errorMessage);
    return { data: null, error: errorMessage };
  }
}
