/**
 * Validate invite tokens embedded in `/join/[token]` URLs (UUID v4-style hex).
 */

export function isInviteTokenFormat(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}
