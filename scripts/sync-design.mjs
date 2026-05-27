/**
 * Pencil ↔ ソースの自動同期（tokens.json → globals.css / .pen variables / pencil-tokens.ts）
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

const scripts = [
  "sync-design-tokens.mjs",
];

for (const scriptName of scripts) {
  const scriptPath = path.join(process.cwd(), "scripts", scriptName);
  console.log(`\n> node ${scriptName}`);
  const result = spawnSync(process.execPath, [scriptPath], {
    stdio: "inherit",
    cwd: process.cwd(),
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\nDesign sync complete.");
