/**
 * Restricts post-auth redirects to same-origin pathnames (open-redirect safe).
 * 認証後リダイレクトを同一オリジンのパスに限定する（オープンリダイレクト対策）。
 */
const MAX_REDIRECT_PATH_LEN = 2048;

export function sanitizeRedirectPath(
  rawPath: string | null | undefined,
): string | null {
  if (rawPath == null) return null;
  const trimmed = rawPath.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("..") ||
    trimmed.includes("\\") ||
    trimmed.length > MAX_REDIRECT_PATH_LEN
  ) {
    return null;
  }
  return trimmed;
}
