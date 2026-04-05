#!/usr/bin/env node
/**
 * One-shot: link Vercel project `splitrip`, push `.env.local` to Preview, deploy preview.
 * 一括: Vercel プロジェクト `splitrip` をリンクし、`.env.local` を Preview に投入してプレビューデプロイする。
 *
 * Why `preview` not `staging`: Vercel CLI accepts `production | preview | development` only.
 * 理由: Vercel CLI が受け付けるのは production / preview / development のみ（ユーザーの Staging は preview に相当）。
 *
 * Usage / 使い方:
 *   1. `vercel login`（ブラウザで認証） / Authenticate in browser
 *   2. `node scripts/vercel-staging-setup.mjs` from repo root / リポジトリルートで実行
 *
 * Options / オプション:
 *   --link-only   Only `vercel link` / リンクのみ
 *   --env-only    Only push env vars / 環境変数のみ
 *   --deploy-only Only `vercel deploy` / デプロイのみ
 */

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PROJECT_NAME = "splitrip";
/** Vercel target env (maps to “Staging” preview deployments). / 「Staging」相当のプレビュー用 */
const VERCEL_ENV = "preview";
const ENV_FILE = join(ROOT, ".env.local");

const args = new Set(process.argv.slice(2));
const linkOnly = args.has("--link-only");
const envOnly = args.has("--env-only");
const deployOnly = args.has("--deploy-only");

function runVercel(argv, { inheritIo = false } = {}) {
  const stdio = inheritIo ? "inherit" : ["ignore", "pipe", "pipe"];
  const r = spawnSync("vercel", argv, {
    cwd: ROOT,
    encoding: "utf8",
    stdio,
    env: process.env,
    shell: process.platform === "win32",
  });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  return { code: r.status ?? 1, out };
}

function ensureLoggedIn() {
  const { code, out } = runVercel(["whoami"]);
  if (code === 0 && out.trim().length > 0) {
    return true;
  }
  console.error(
    "[splitrip] Not logged in. Run `vercel login` first, then retry.\n" +
      "[splitrip] 未ログインです。先に `vercel login` を実行してから再試行してください。",
  );
  return false;
}

function linkProject() {
  console.log(
    `[splitrip] vercel link --yes --project ${PROJECT_NAME} … / プロジェクトをリンク中…`,
  );
  const { code, out } = runVercel(
    ["link", "--yes", "--project", PROJECT_NAME],
    { inheritIo: true },
  );
  if (code !== 0) {
    console.error(out);
    process.exit(code ?? 1);
  }
}

/**
 * Parse KEY=VALUE lines; skip comments and blanks.
 * コメント・空行を除き KEY=VALUE を解析（先頭の = のみ区切り）。
 */
function parseDotEnv(content) {
  const pairs = [];
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const eq = line.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) {
      pairs.push({ key, value });
    }
  }
  return pairs;
}

function isSensitiveKey(key) {
  return !key.startsWith("NEXT_PUBLIC_");
}

function envAlreadyExistsMessage(out) {
  return /already exists|duplicate|Conflict/i.test(out);
}

function pushEnvVars() {
  if (!existsSync(ENV_FILE)) {
    console.error(
      `[splitrip] Missing ${ENV_FILE}. Create .env.local first.\n` +
        `[splitrip] ${ENV_FILE} がありません。.env.local を作成してください。`,
    );
    process.exit(1);
  }
  const content = readFileSync(ENV_FILE, "utf8");
  const pairs = parseDotEnv(content);
  if (pairs.length === 0) {
    console.warn(
      "[splitrip] No KEY= pairs found in .env.local. / .env.local に有効な行がありません。",
    );
    return;
  }
  for (const { key, value } of pairs) {
    const sensitiveArgs = isSensitiveKey(key) ? ["--sensitive"] : [];
    const argv = [
      "env",
      "add",
      key,
      VERCEL_ENV,
      "--value",
      value,
      "--yes",
      ...sensitiveArgs,
    ];
    const { code, out } = runVercel(argv);
    const combined = `${out}`;
    if (code === 0) {
      console.log(`[splitrip] env add OK: ${key} (${VERCEL_ENV})`);
      continue;
    }
    if (envAlreadyExistsMessage(combined)) {
      console.warn(
        `[splitrip] skip (already set): ${key} / スキップ（既存）: ${key}`,
      );
      continue;
    }
    console.error(`[splitrip] env add failed: ${key}\n${combined}`);
    process.exit(code ?? 1);
  }
}

function deployPreview() {
  console.log("[splitrip] vercel deploy --yes … / プレビューデプロイ中…");
  const { code, out } = runVercel(["deploy", "--yes"]);
  if (code !== 0) {
    console.error(out);
    process.exit(code ?? 1);
  }
  console.log(out);
  const urls = out.match(/https:\/\/[^\s)]+/g) ?? [];
  const unique = [...new Set(urls)];
  if (unique.length > 0) {
    console.log("\n[splitrip] Detected URLs / 検出した URL:");
    for (const u of unique) {
      console.log(`  ${u}`);
    }
  }
}

function main() {
  if (!ensureLoggedIn()) {
    process.exit(1);
  }

  if (deployOnly) {
    deployPreview();
    return;
  }

  if (envOnly) {
    pushEnvVars();
    return;
  }

  if (linkOnly) {
    linkProject();
    return;
  }

  linkProject();
  pushEnvVars();
  deployPreview();
}

main();
