/**
 * Banner / plain-text UI 用に、Markdown 由来の代表的な記法だけを除去する。
 * （完全なパーサではなく見た目優先の簡易ストリップ。）
 */

function stripIndentedCodeFenceBlock(textPayload: string): string {
  return textPayload.replace(/^```[\s\S]*?^```/gm, (fencedChunk: string) => {
    const withoutDelimiters = fencedChunk.replace(/^```[^\n]*\n/, "").replace(/\n```$/, "");
    return withoutDelimiters.trimEnd();
  });
}

function collapseBlankRuns(textPayload: string): string {
  return textPayload.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * メンテ告知バナー等で、そのまま生の Markdown を並べないために使う。
 */
export function stripMarkdownForPlainDisplay(sourceMarkdown: string): string {
  const withUnixNewlines = sourceMarkdown.replace(/\r\n/g, "\n");

  let resultText = stripIndentedCodeFenceBlock(withUnixNewlines);

  resultText = resultText.replace(/\*\*([^*]+)\*\*/g, "$1");
  resultText = resultText.replace(/__([^_]+)__/g, "$1");

  resultText = resultText.replace(/`([^`]+)`/g, "$1");

  resultText = resultText.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");

  resultText = resultText.replace(/^#{1,6}\s+/gm, "");

  resultText = resultText.replace(/(^|\s)~~([^~]+)~~(?=\s|$)/g, "$1$2");

  resultText = resultText.replace(/\*([^*\n]+)\*/g, "$1");

  resultText = resultText.replace(/^([-*+]|\d+\.)\s+/gm, "");

  resultText = resultText.replace(/^[-*_]{3,}\s*$/gm, "");

  return collapseBlankRuns(resultText);
}
