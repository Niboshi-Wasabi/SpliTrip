import { NextRequest, NextResponse } from "next/server";
import { AUTH_ERROR } from "@/lib/auth/auth-error-codes";
import { redirectToLoginError } from "@/lib/auth/auth-redirects";
import { localizedDashboardPathFromRequest } from "@/lib/i18n/locale-from-request";
import { upsertUserProfileFromAuth } from "@/lib/user-profile";
import { createRouteHandlerSupabaseClient } from "@/utils/supabase/route-handler";

function sanitizeRedirectPath(rawPath: string | null): string | null {
  if (!rawPath) return null;
  if (!rawPath.startsWith("/") || rawPath.startsWith("//")) {
    return null;
  }
  return rawPath;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const redirectPath =
    sanitizeRedirectPath(url.searchParams.get("next")) ??
    localizedDashboardPathFromRequest(request);

  if (!code) {
    return redirectToLoginError(origin, AUTH_ERROR.AUTH);
  }

  const response = NextResponse.redirect(`${origin}${redirectPath}`);
  const supabase = createRouteHandlerSupabaseClient(request, response);

  if (!supabase) {
    return redirectToLoginError(origin, AUTH_ERROR.AUTH);
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
    code,
  );

  if (exchangeError) {
    console.error("Auth code exchange failed:", exchangeError.message);
    return redirectToLoginError(origin, AUTH_ERROR.AUTH);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await upsertUserProfileFromAuth(supabase, user);
  }

  return response;
}
