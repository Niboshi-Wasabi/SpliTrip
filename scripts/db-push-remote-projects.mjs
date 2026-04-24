/**
 * リモートの Supabase プロジェクト（複数）に同じマイグレーションを順に適用する。
 * 事前: `npm run db:login`（または `npx supabase login`）で CLI にログイン済みであること。
 *
 * 対象 project ref は SpliTrip の 2 環境用（ダッシュボードで確認可能な ID）。
 * @see https://supabase.com/dashboard/project/fdfwnoaqdlfiywtggsfi
 * @see https://supabase.com/dashboard/project/qolteiqmcidmfzprkotq
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const DEFAULT_PROJECT_REFS = [
  "fdfwnoaqdlfiywtggsfi",
  "qolteiqmcidmfzprkotq",
];

/** Windows では `npx` + `shell: true` で supabase CLI を確実に起動する。 */
function runSupabase(args) {
  const useShell = process.platform === "win32";
  const r = spawnSync("npx", ["supabase", ...args], {
    cwd: root,
    stdio: "inherit",
    shell: useShell,
    env: { ...process.env },
  });
  if (r.error) {
    console.error(r.error.message);
    process.exit(1);
  }
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

function main() {
  const fromEnv = (process.env.SUPABASE_DB_PUSH_REFS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const refs = fromEnv.length > 0 ? fromEnv : DEFAULT_PROJECT_REFS;

  console.log(
    "次の project ref に `db push` します（順）:\n  " + refs.join("\n  "),
  );
  if (fromEnv.length === 0) {
    console.log(
      "（`SUPABASE_DB_PUSH_REFS=ref1,ref2` で上書き可）\n",
    );
  }

  for (const ref of refs) {
    console.log(`\n--- supabase link --project-ref ${ref} ---\n`);
    runSupabase(["link", "--project-ref", ref]);
    console.log(`\n--- supabase db push --yes（${ref}）---\n`);
    // --yes: 非対話（CI/スクリプト用）。衝突する場合は README の「マイグレーション履歴」の節を参照
    runSupabase(["db", "push", "--yes"]);
  }

  console.log("\n完了: すべてのプロジェクトにマイグレーションを反映しました。");
  console.log(
    "ローカルに紐づく project は最後の ref です。別 ref で作業する場合は `npm run db:link` を再実行してください。",
  );
}

main();
