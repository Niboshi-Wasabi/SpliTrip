import { stripLocaleFromPathname } from "@/utils/supabase/middleware";

/** メンテナンス中でも未ログインの管理者が OAuth できるログイン導線（ロケール接頭辞を除いたパス）。 */
export const STAFF_ADMIN_LOGIN_PATH_WITHOUT_LOCALE = "/login/staff";

export function pathnameIsStaffAdminLoginPath(pathname: string): boolean {
  return (
    stripLocaleFromPathname(pathname) === STAFF_ADMIN_LOGIN_PATH_WITHOUT_LOCALE
  );
}
