"use client";

import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const safeMarkdownAnchorsOnly: Components = {
  /**
   * `react-markdown` は既定で生 HTML を解釈しない（XSS 対策）。リンクのみ外部別タブへ。
   * Raw HTML は付与しない（`rehype-raw` 不使用）。
   */
  a: ({ href, children, ...anchorProps }) => {
    const resolvedHrefCandidate = href ?? "";
    const resolvedHref =
      typeof resolvedHrefCandidate === "string"
        ? resolvedHrefCandidate.trim()
        : String(resolvedHrefCandidate);
    const isProbablyExternalAbsolute =
      /^https?:\/\//i.test(resolvedHref) || resolvedHref.startsWith("//");

    return (
      <a
        href={resolvedHref || undefined}
        {...anchorProps}
        {...(isProbablyExternalAbsolute
          ? {
              target: "_blank",
              rel: "noopener noreferrer",
            }
          : {})}
      >
        {children}
      </a>
    );
  },
};

type SafeMarkdownProps = {
  markdown: string;
  className?: string;
};

/** Supabase に保存される Markdown 本文など、ユーザー生成コンテンツ向け。** */
export function SafeMarkdown({ markdown, className }: SafeMarkdownProps) {
  const trimmedMarkdown = markdown.trim();
  if (trimmedMarkdown.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={safeMarkdownAnchorsOnly}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
