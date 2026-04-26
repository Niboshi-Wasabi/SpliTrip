/**
 * Next.js root middleware - handles i18n routing and authentication.
 * ルートミドルウェア - i18n ルーティングと認証を処理。
 */

import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";
import { proxy } from "./src/proxy";

const intlMiddleware = createIntlMiddleware(routing);

export default async function middleware(request: NextRequest): Promise<NextResponse> {
  // 1. Handle i18n routing first
  const intlResponse = intlMiddleware(request);
  
  // 2. Run proxy logic (authentication, admin checks, etc.)
  const proxyResponse = await proxy(request);
  
  // 3. Combine responses - proxy takes precedence for redirects
  if (proxyResponse.headers.get("location")) {
    return proxyResponse;
  }
  
  return intlResponse;
}

export const config = {
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
};