import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { builtinModules } from "node:module";

const ROOT = process.cwd();
const TARGET_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".cts",
  ".mts",
  ".py",
  ".sql",
]);
const IGNORE_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".swc",
  "node_modules",
  ".cursor",
  ".vercel",
  "coverage",
  "dist",
  "build",
]);

function walk(directoryPath, collector = []) {
  const entries = readdirSync(directoryPath);
  for (const entry of entries) {
    const absolutePath = path.join(directoryPath, entry);
    const relativePath = path.relative(ROOT, absolutePath);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      if (IGNORE_DIRECTORIES.has(entry)) {
        continue;
      }
      walk(absolutePath, collector);
      continue;
    }

    if (!TARGET_EXTENSIONS.has(path.extname(entry))) {
      continue;
    }
    collector.push(relativePath);
  }
  return collector;
}

function readPackageNames() {
  const packageJsonPath = path.join(ROOT, "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  return new Set([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
  ]);
}

function getExternalImportBase(specifier) {
  if (
    specifier.startsWith(".") ||
    specifier.startsWith("@/") ||
    specifier.startsWith("/") ||
    specifier.startsWith("#")
  ) {
    return null;
  }
  if (specifier.startsWith("node:")) {
    return specifier;
  }
  if (specifier.startsWith("@")) {
    return specifier.split("/").slice(0, 2).join("/");
  }
  return specifier.split("/")[0];
}

const importRegex =
  /import\s+(?:[^"'`]*?\s+from\s+)?["']([^"']+)["']|require\(\s*["']([^"']+)["']\s*\)|import\(\s*["']([^"']+)["']\s*\)/g;

function pushFinding(findings, rule, file, line, snippet) {
  findings.push({ rule, file, line, snippet });
}

function getLineNumberByIndex(text, index) {
  return text.slice(0, index).split("\n").length;
}

function scanFiles() {
  const files = walk(ROOT);
  const declaredPackages = readPackageNames();
  const builtinSet = new Set([
    ...builtinModules,
    ...builtinModules.map((moduleName) => `node:${moduleName}`),
  ]);

  const findings = [];

  for (const file of files) {
    const absolutePath = path.join(ROOT, file);
    const content = readFileSync(absolutePath, "utf8");

    // 1) 存在しないパッケージ import
    for (const match of content.matchAll(importRegex)) {
      const specifier = match[1] ?? match[2] ?? match[3];
      if (!specifier) {
        continue;
      }
      const base = getExternalImportBase(specifier);
      if (!base) {
        continue;
      }
      if (builtinSet.has(base)) {
        continue;
      }
      if (!declaredPackages.has(base)) {
        pushFinding(
          findings,
          "unknown_external_import",
          file,
          getLineNumberByIndex(content, match.index ?? 0),
          specifier,
        );
      }
    }

    // 2) f-string SQL / 3) except: pass
    if (file.endsWith(".py")) {
      for (const match of content.matchAll(/f["'][^"'`]*(SELECT|INSERT|UPDATE|DELETE)/gi)) {
        pushFinding(
          findings,
          "python_fstring_sql",
          file,
          getLineNumberByIndex(content, match.index ?? 0),
          match[0].slice(0, 120),
        );
      }
      for (const match of content.matchAll(/except\s*(?:Exception)?\s*:\s*pass/g)) {
        pushFinding(
          findings,
          "python_except_pass",
          file,
          getLineNumberByIndex(content, match.index ?? 0),
          "except ...: pass",
        );
      }
    }

    // 4) 直書きシークレット候補
    for (const match of content.matchAll(
      /(sk-[A-Za-z0-9]{10,}|whsec_[A-Za-z0-9]{10,}|AIza[0-9A-Za-z_-]{20,}|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|(?:API_KEY|SECRET_KEY|ACCESS_TOKEN|PRIVATE_KEY)\s*=\s*["'][^"']+["'])/g,
    )) {
      pushFinding(
        findings,
        "hardcoded_secret_candidate",
        file,
        getLineNumberByIndex(content, match.index ?? 0),
        match[0].slice(0, 120),
      );
    }

    // 5) ユーザー入力ファイルパス結合候補
    // Why: reduce false positives by requiring both (a) path join usage and
    // (b) user-input-like tokens in the same file.
    const hasPathJoin = /(os\.path\.join\(|path\.join\(|path\.resolve\(|path\.normalize\()/g.test(
      content,
    );
    const hasUserInputToken =
      /(file\.filename|req\.|request\.|searchParams\.get\(|params\.get\(|formData\.get\()/g.test(
        content,
      );
    if (hasPathJoin && hasUserInputToken) {
      const firstIndex = content.search(
        /(os\.path\.join\(|path\.join\(|path\.resolve\(|path\.normalize\()/,
      );
      pushFinding(
        findings,
        "user_input_path_candidate",
        file,
        getLineNumberByIndex(content, Math.max(firstIndex, 0)),
        "path join with user-input-like token in same file",
      );
    }
  }

  return findings;
}

const findings = scanFiles();

if (findings.length === 0) {
  console.log("Security scan passed: no matched risky patterns.");
  process.exit(0);
}

console.error(`Security scan detected ${findings.length} potential issue(s):`);
for (const finding of findings) {
  console.error(
    `- [${finding.rule}] ${finding.file}:${finding.line} -> ${finding.snippet}`,
  );
}
process.exit(1);
