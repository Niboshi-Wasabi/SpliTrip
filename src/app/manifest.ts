/**
 * Web App Manifest for PWA install & standalone display.
 * PWA 対応: ホーム画面追加・全画面表示・スプラッシュ画面を提供する。
 *
 * Next.js は `app/manifest.ts` を自動的に `/manifest.webmanifest` としてサーブする。
 * Next.js auto-serves `app/manifest.ts` as `/manifest.webmanifest`.
 */

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SpliTrip — グループ旅行の精算アプリ",
    short_name: "SpliTrip",
    description:
      "グループ旅行中の立替をリアルタイムに記録し、精算を自動計算するPWA",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0f766e",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
