import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // フォント最適化設定
  optimizeFonts: true,
  
  // 不要なプリロードを避けるための設定
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-avatar',
      'recharts',
    ],
  },
  
  // フォントプリロードの制御
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

export default withNextIntl(nextConfig);
