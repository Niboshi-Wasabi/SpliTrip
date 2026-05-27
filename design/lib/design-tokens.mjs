import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const TOKENS_JSON_PATH = path.join(REPO_ROOT, "design/tokens.json");
const GLOBALS_CSS_PATH = path.join(REPO_ROOT, "src/app/globals.css");

export function loadDesignTokens() {
  const raw = fs.readFileSync(TOKENS_JSON_PATH, "utf8");
  return JSON.parse(raw);
}

function penEntry(value) {
  return { type: typeof value === "number" ? "number" : "color", value };
}

export function buildPenLightVariables(tokenDocument = loadDesignTokens()) {
  const variables = {};
  for (const [key, entry] of Object.entries(tokenDocument.variables)) {
    if (entry.light != null) {
      variables[key] = penEntry(entry.light);
    } else if (entry.value != null) {
      variables[key] = penEntry(entry.value);
    }
  }
  return variables;
}

export function buildPenDarkVariables(tokenDocument = loadDesignTokens()) {
  const variables = {};
  for (const [key, entry] of Object.entries(tokenDocument.variables)) {
    if (!key.startsWith("color.apple.")) {
      continue;
    }
    const suffix = key.slice("color.apple.".length);
    if (entry.dark != null) {
      variables[`color.dark.${suffix}`] = penEntry(entry.dark);
    }
  }
  return variables;
}

export function buildPenFileVariables(tokenDocument = loadDesignTokens()) {
  return {
    ...buildPenLightVariables(tokenDocument),
    ...buildPenDarkVariables(tokenDocument),
  };
}

function extractCssBlock(cssText, selector) {
  const pattern = new RegExp(
    `${selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`,
    "s",
  );
  const match = cssText.match(pattern);
  if (!match) {
    throw new Error(`CSS block not found for selector: ${selector}`);
  }
  return { full: match[0], body: match[1], index: match.index };
}

function replaceCssVarInBlock(blockBody, cssVar, value) {
  const linePattern = new RegExp(`^(\\s*${cssVar}\\s*:\\s*)[^;]+;`, "m");
  if (!linePattern.test(blockBody)) {
    return `${blockBody}  ${cssVar}: ${value};\n`;
  }
  return blockBody.replace(linePattern, `$1${value};`);
}

function patchCssBlock(cssText, selector, tokenDocument, themeKey) {
  const block = extractCssBlock(cssText, selector);
  let body = block.body;
  for (const entry of Object.values(tokenDocument.variables)) {
    if (entry.css && entry[themeKey] != null) {
      body = replaceCssVarInBlock(body, entry.css, entry[themeKey]);
    }
  }
  const nextBlock = `${selector} {${body}}`;
  return `${cssText.slice(0, block.index)}${nextBlock}${cssText.slice(block.index + block.full.length)}`;
}

export function patchGlobalsCss(tokenDocument = loadDesignTokens()) {
  let cssText = fs.readFileSync(GLOBALS_CSS_PATH, "utf8");
  cssText = patchCssBlock(cssText, ":root", tokenDocument, "light");
  cssText = patchCssBlock(cssText, ".dark", tokenDocument, "dark");
  fs.writeFileSync(GLOBALS_CSS_PATH, cssText);
}

export function listPenFiles() {
  const designRoot = path.join(REPO_ROOT, "design");
  const results = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith(".pen")) {
        results.push(fullPath);
      }
    }
  }
  if (fs.existsSync(designRoot)) {
    walk(designRoot);
  }
  return results;
}

export function patchAllPenFiles(tokenDocument = loadDesignTokens()) {
  const variables = buildPenFileVariables(tokenDocument);
  const penFiles = listPenFiles();
  for (const penPath of penFiles) {
    const penDocument = JSON.parse(fs.readFileSync(penPath, "utf8"));
    const nextDocument = { ...penDocument, variables };
    fs.writeFileSync(penPath, `${JSON.stringify(nextDocument, null, 2)}\n`);
  }
  return { penFileCount: penFiles.length, variableCount: Object.keys(variables).length };
}
