import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // パッケージインポート最適化（バンドルサイズ削減）
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-avatar',
      'recharts',
    ],
  },
  
  // プロダクション最適化
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // アセット配信の改善
  output: 'standalone',
  
  // 静的アセット最適化
  generateEtags: false,
  poweredByHeader: false,
  
  // 開発時のパフォーマンス改善
  onDemandEntries: {
    // ページがメモリに保持される時間を短縮
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default withNextIntl(nextConfig);
