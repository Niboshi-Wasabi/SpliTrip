"use client";

import { useLayoutEffect } from "react";

type Props = {
  /** Same string as the former `[locale]/layout` `html` `className` (next/font + `h-full antialiased`). */
  htmlClassName: string;
  lang: string;
  dataUiSans: string;
  dataUiMono: string;
  direction?: "ltr" | "rtl";
};

/**
 * ルート `app/layout` が `<html>` を持つ都合で、ロケール毎の `class` / `lang` / `data-ui-*` を
 * ここで `documentElement` に同期する。`useLayoutEffect` により再描画前に反映する。
 */
export function SyncDocumentLocale({
  htmlClassName,
  lang,
  dataUiSans,
  dataUiMono,
  direction = "ltr",
}: Props) {
  useLayoutEffect(() => {
    const el = document.documentElement;
    el.lang = lang;
    el.dir = direction;
    el.setAttribute("data-ui-sans", dataUiSans);
    el.setAttribute("data-ui-mono", dataUiMono);
    el.className = htmlClassName;
  }, [htmlClassName, lang, dataUiMono, dataUiSans, direction]);

  return null;
}
