#!/usr/bin/env node
/**
 * Push `.env.local` values to Vercel **Preview** for Git branch **`staging`** only.
 * `.env.local` の値を Vercel の **Preview**（Git ブランチ **`staging` のみ**）へ登録する。
 *
 * Why branch-scoped Preview: `NEXT_PUBLIC_LINE_REDIRECT_URI` must match a stable hostname;
 * Vercel aliases `staging` as `splitrip-git-staging-<team>.vercel.app`.
 * 理由: LINE のリダイレクト URI は安定ホストと一致が必要。Vercel は `staging` にブランチ用エイリアスを付与する。
 *
 * Override / 上書き: `NEXT_PUBLIC_LINE_REDIRECT_URI` → `{PREVIEW_STAGING_ORIGIN}/api/auth/callback/line`
 *
 * Usage / 使い方: `node scripts/vercel-env-push-preview-staging.mjs`
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

/**
 * Resolve Vercel CLI for `spawnSync` on Windows (`vercel` alone can be ENOENT).
 * Windows では `vercel` 単体だと ENOENT になりがちなので `vercel.cmd` + shell を使う。
 */
function vercelSpawnArgs(args) {
  if (process.platform === "win32") {
    return { cmd: "vercel.cmd", args, shell: true };
  }
  return { cmd: "vercel", args, shell: false };
}

/**
 * Stable Preview alias for branch `staging` (`vercel inspect <deployment>` → Aliases).
 * Override with env `PREVIEW_STAGING_ORIGIN` if the team slug / hostname changes.
 * チームスラッグやホストが変わったら環境変数 `PREVIEW_STAGING_ORIGIN` で上書き。
 */
const PREVIEW_STAGING_ORIGIN =
  process.env.PREVIEW_STAGING_ORIGIN?.trim() ||
  "https://splitrip-git-staging-niboshi-wasabis-projects.vercel.app";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

function parseEnvLocal(text) {
  /** @type {Array<{ key: string; value: string }>} */
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    const key = t.slice(0, eq).trim();
    const value = t.slice(eq + 1);
    if (!key) continue;
    out.push({ key, value });
  }
  return out;
}

function isSensitiveKey(key) {
  return /SECRET|ANON_KEY/i.test(key);
}

function vercelEnvAddPreviewStaging(key, value) {
  const args = [
    "env",
    "add",
    key,
    "preview",
    "staging",
    "--yes",
    "--force",
  ];
  if (isSensitiveKey(key)) args.push("--sensitive");

  const { cmd, args: a, shell } = vercelSpawnArgs(args);
  const r = spawnSync(cmd, a, {
    cwd: root,
    input: value,
    encoding: "utf8",
    stdio: ["pipe", "inherit", "inherit"],
    shell,
    env: process.env,
  });

  if (r.status !== 0) {
    console.error(
      `[vercel-env-preview-staging] failed: ${key} (exit ${r.status})`,
    );
  }
}

const raw = readFileSync(envPath, "utf8");
const pairs = parseEnvLocal(raw);

console.log(
  `[vercel-env-preview-staging] ${pairs.length} variable(s) → Preview / branch staging`,
);

for (const { key, value } of pairs) {
  let v = value;
  if (key === "NEXT_PUBLIC_LINE_REDIRECT_URI") {
    v = `${PREVIEW_STAGING_ORIGIN}/api/auth/callback/line`;
  }
  console.log(`[vercel-env-preview-staging] adding ${key} ...`);
  vercelEnvAddPreviewStaging(key, v);
}
