import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // 完全に最小設定
  poweredByHeader: false,
  
  // コードスプリッティングの制御（404エラー対策）
  experimental: {
    esmExternals: true,
  },
  
  // webpack設定で404エラー対策
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // クライアント側でのチャンク読み込み改善
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            chunks: 'all',
            enforce: true,
          },
        },
      };
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
