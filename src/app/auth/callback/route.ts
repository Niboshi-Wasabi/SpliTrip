import { NextRequest, NextResponse } from "next/server";
import { AUTH_ERROR } from "@/lib/auth/auth-error-codes";
import { redirectToLoginError } from "@/lib/auth/auth-redirects";
import { sanitizeRedirectPath } from "@/lib/auth/sanitize-redirect-path";
import { localizedDashboardPathFromRequest } from "@/lib/i18n/locale-from-request";
import { upsertUserProfileFromAuth } from "@/lib/user-profile";
import { createRouteHandlerSupabaseClient } from "@/utils/supabase/route-handler";

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
    console.error(
      "[API/Action Error - GET /auth/callback exchangeCodeForSession]:",
      exchangeError,
    );
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
