import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  /**
   * Browsers request `/favicon.ico` by default; we ship a PNG under `/icons/` and map it here
   * so the tab icon updates without relying on `app/icon` heuristics alone.
   */
  async rewrites() {
    return [
      {
        source: "/favicon.ico",
        destination: "/icons/favicon-32x32.png",
      },
    ];
  },
};

export default withNextIntl(nextConfig);
