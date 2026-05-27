import {
  loadDesignTokens,
  patchAllPenFiles,
  patchGlobalsCss,
} from "../design/lib/design-tokens.mjs";
import { writePencilTokensTs } from "../design/lib/write-pencil-tokens-ts.mjs";

const tokenDocument = loadDesignTokens();
patchGlobalsCss(tokenDocument);
const penResult = patchAllPenFiles(tokenDocument);
writePencilTokensTs(tokenDocument);

console.log(
  `Synced tokens: globals.css + ${penResult.penFileCount} .pen files (${penResult.variableCount} variables)`,
);
