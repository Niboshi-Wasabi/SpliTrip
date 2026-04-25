import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // 最小限の設定に戻す
  experimental: {
    // 問題が発生している可能性のある設定を無効化
    turbo: {
      // Turbopack設定を明示的に制御
      rules: {},
    },
  },
  
  // 基本設定のみ保持
  poweredByHeader: false,
};

export default withNextIntl(nextConfig);
