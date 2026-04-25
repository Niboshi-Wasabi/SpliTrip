import { redirect } from "next/navigation";

/**
 * /groups へのダイレクトアクセスをダッシュボードにリダイレクト
 * プリフェッチで発生する404エラーを防ぐためのキャッチルート
 */
export default function GroupsRootPage() {
  redirect("/dashboard");
}