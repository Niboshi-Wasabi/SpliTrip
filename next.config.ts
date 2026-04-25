import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // 完全に最小設定
  poweredByHeader: false,
};

export default withNextIntl(nextConfig);
