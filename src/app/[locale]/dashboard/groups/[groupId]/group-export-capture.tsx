"use client";

/**
 * React context wiring a single `ref` around expense + settlement cards for PNG export.
 * PNG 用に出費・精算カードを囲む共有 `ref` を React Context で渡す。
 *
 * Why context: the toolbar and capture wrapper are siblings in the RSC tree; ref cannot be passed without a client boundary.
 * 理由: ツールバーとキャプチャ枠は兄弟なので、クライアント境界なしでは ref を渡せない。
 */

import {
  createContext,
  useContext,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { cn } from "@/lib/utils";

const GroupExportCaptureRefContext =
  createContext<RefObject<HTMLDivElement | null> | null>(null);

/**
 * Installs the shared capture ref for descendant `GroupExportCaptureArea` + toolbar consumers.
 * 子の `GroupExportCaptureArea` とツールバーが共有するキャプチャ用 ref を提供する。
 *
 * Why provider at page level: keeps one ref owner; avoids prop drilling through server components.
 * 理由: ref の所有者を 1 つにし、サーバーコンポーネント間の props バケツリレーを避ける。
 */
export function GroupExportCaptureProvider({
  children,
}: {
  children: ReactNode;
}) {
  const captureRef = useRef<HTMLDivElement>(null);
  return (
    <GroupExportCaptureRefContext.Provider value={captureRef}>
      {children}
    </GroupExportCaptureRefContext.Provider>
  );
}

/**
 * Wrapper that mounts the capture target ref around export-visible content.
 * 書き出し対象コンテンツにキャプチャ用 ref を付与するラッパー。
 */
export function GroupExportCaptureArea({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const captureRef = useContext(GroupExportCaptureRefContext);
  if (!captureRef) {
    throw new Error(
      "GroupExportCaptureArea must be used inside GroupExportCaptureProvider",
    );
  }
  return (
    <div
      ref={captureRef}
      className={cn("space-y-6", className)}
      data-splitrip-export-capture="true"
    >
      {children}
    </div>
  );
}

/**
 * Access the capture root for html2canvas from sibling toolbar code.
 * 兄弟のツールバーから html2canvas 用のルート要素を取得する。
 *
 * Why throws when missing: fail fast if provider wiring regresses.
 * 理由: Provider 欠落を早期に検知する。
 */
export function useGroupExportCaptureRef(): RefObject<HTMLDivElement | null> {
  const captureRef = useContext(GroupExportCaptureRefContext);
  if (!captureRef) {
    throw new Error(
      "useGroupExportCaptureRef must be used inside GroupExportCaptureProvider",
    );
  }
  return captureRef;
}
