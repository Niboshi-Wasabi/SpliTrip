import { AdminAppShell } from "./admin-app-shell";

type Props = { children: React.ReactNode };

/**
 * 管理スイート全体のシェル（タブ＋戻る）。is_admin / Step-Up は `src/proxy.ts` 側で担保。
 */
export default function AdminLayout({ children }: Props) {
  return <AdminAppShell>{children}</AdminAppShell>;
}
