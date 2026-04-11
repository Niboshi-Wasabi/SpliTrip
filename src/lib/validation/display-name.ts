/**
 * Shared rules for `user_profiles.display_name` (DB / UI / API).
 */

export const DISPLAY_NAME_MAX_LENGTH = 50;

export type DisplayNameValidationFailure =
  | "not_string"
  | "empty"
  | "too_long";

export type DisplayNameValidationResult =
  | { ok: true; value: string }
  | { ok: false; reason: DisplayNameValidationFailure };

/**
 * Validates a display name from JSON / form input after trim.
 */
export function validateDisplayNameInput(raw: unknown): DisplayNameValidationResult {
  if (typeof raw !== "string") {
    return { ok: false, reason: "not_string" };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: "empty" };
  }
  if (trimmed.length > DISPLAY_NAME_MAX_LENGTH) {
    return { ok: false, reason: "too_long" };
  }
  return { ok: true, value: trimmed };
}
