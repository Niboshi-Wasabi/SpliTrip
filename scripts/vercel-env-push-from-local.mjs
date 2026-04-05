#!/usr/bin/env node
/**
 * Read `.env.local` and push each `KEY=VALUE` to Vercel **Production** via the CLI.
 * ローカルの `.env.local` を読み、各 `KEY=VALUE` を Vercel CLI で **Production** に登録する。
 *
 * Why Production (not Preview / “staging”): With no Git repo linked to the Vercel project,
 * branch-scoped Preview env vars cannot be created from the CLI (API returns an error).
 * Preview / Staging 相当を CLI で使うには Git 連携が必要なため、未連携時は Production に載せる。
 *
 * Usage / 使い方: `node scripts/vercel-env-push-from-local.mjs`
 *
 * Requires / 前提: `vercel` logged in and `vercel link` done in this repo root.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

/**
 * Production site origin for LINE callback (override with env `SPLITRIP_PRODUCTION_ORIGIN`).
 * 本番のサイトオリジン（`SPLITRIP_PRODUCTION_ORIGIN` で上書き可）。`.env.local` が localhost でも本番 URI を誤登録しない。
 */
const PRODUCTION_ORIGIN =
  process.env.SPLITRIP_PRODUCTION_ORIGIN?.trim() ||
  "https://splitrip-zeta.vercel.app";

function vercelSpawnArgs(args) {
  if (process.platform === "win32") {
    return { cmd: "vercel.cmd", args, shell: true };
  }
  return { cmd: "vercel", args, shell: false };
}

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

function vercelEnvAdd(key, value) {
  /**
   * Pass the secret via stdin (not `--value`) so Windows CMD length limits do not truncate JWTs.
   * 値は stdin 経由（`--value` 避け）: Windows のコマンドライン長で JWT が切れないようにする。
   */
  const args = ["env", "add", key, "production", "--yes", "--force"];
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
    console.error(`[vercel-env-push] skip or failed: ${key} (exit ${r.status})`);
  }
}

const raw = readFileSync(envPath, "utf8");
const pairs = parseEnvLocal(raw);
console.log(`[vercel-env-push] ${pairs.length} variable(s) from .env.local → Vercel Production`);

for (const { key, value } of pairs) {
  let v = value;
  if (key === "NEXT_PUBLIC_LINE_REDIRECT_URI") {
    v = `${PRODUCTION_ORIGIN}/api/auth/callback/line`;
  }
  console.log(`[vercel-env-push] adding ${key} ...`);
  vercelEnvAdd(key, v);
}
