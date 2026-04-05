/**
 * 検証なしで JWT ペイロードを解く（表示用メタデータ取得のみ。真正性は別途検証すること）。
 */
export function decodeJwtPayloadUnsafe(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("invalid jwt");

  const segment = parts[1];
  let json: string;
  try {
    json = Buffer.from(segment, "base64url").toString("utf8");
  } catch {
    const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
    const pad = normalized.length % 4;
    const padded =
      pad === 0 ? normalized : normalized + "=".repeat(4 - pad);
    json = Buffer.from(padded, "base64").toString("utf8");
  }

  return JSON.parse(json) as Record<string, unknown>;
}

/** パース失敗時は null（コールバック等でガード句に使う） */
export function decodeJwtPayloadOrNull(
  token: string,
): Record<string, unknown> | null {
  try {
    return decodeJwtPayloadUnsafe(token);
  } catch {
    return null;
  }
}
