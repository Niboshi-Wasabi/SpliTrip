import type { LineOAuthEnv } from "@/utils/line-oauth-env";

const LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
const TOKEN_FETCH_TIMEOUT_MS = 15_000;

type LineTokenJson = {
  id_token?: string;
  access_token?: string;
  error?: string;
  error_description?: string;
};

export type LineTokenExchangeFailure =
  | { reason: "fetch_failed"; cause: unknown }
  | { reason: "invalid_json" }
  | {
      reason: "line_rejected";
      error?: string;
      description?: string;
    }
  | { reason: "missing_id_token" };

export type LineTokenExchangeResult =
  | { ok: true; idToken: string; accessToken?: string }
  | { ok: false; failure: LineTokenExchangeFailure };

function logTokenExchangeFailure(failure: LineTokenExchangeFailure): void {
  switch (failure.reason) {
    case "fetch_failed":
      console.error("LINE token fetch failed:", failure.cause);
      break;
    case "invalid_json":
      console.error("LINE token response was not valid JSON");
      break;
    case "line_rejected":
      console.error(
        "LINE token exchange failed:",
        failure.error,
        failure.description,
      );
      break;
    case "missing_id_token":
      console.error("LINE token response missing id_token");
      break;
  }
}

function tokenExchangeFailed(
  failure: LineTokenExchangeFailure,
): LineTokenExchangeResult {
  logTokenExchangeFailure(failure);
  return { ok: false, failure };
}

/**
 * LINE の認可コードをトークンに交換する。
 * ネットワーク層のみ try（fetch の例外）、JSON は .catch で判別。
 */
export async function exchangeLineAuthorizationCode(
  code: string,
  lineEnv: LineOAuthEnv,
): Promise<LineTokenExchangeResult> {
  let tokenRes: Response;
  try {
    tokenRes = await fetch(LINE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: lineEnv.redirectUri,
        client_id: lineEnv.channelId,
        client_secret: lineEnv.channelSecret,
      }),
      signal: AbortSignal.timeout(TOKEN_FETCH_TIMEOUT_MS),
    });
  } catch (cause) {
    return tokenExchangeFailed({ reason: "fetch_failed", cause });
  }

  const tokenJson = (await tokenRes
    .json()
    .catch(() => null)) as LineTokenJson | null;

  if (tokenJson === null) {
    return tokenExchangeFailed({ reason: "invalid_json" });
  }

  if (!tokenRes.ok || tokenJson.error) {
    return tokenExchangeFailed({
      reason: "line_rejected",
      error: tokenJson.error,
      description: tokenJson.error_description,
    });
  }

  const idToken = tokenJson.id_token?.trim();
  if (!idToken) {
    return tokenExchangeFailed({ reason: "missing_id_token" });
  }

  return {
    ok: true,
    idToken,
    ...(tokenJson.access_token
      ? { accessToken: tokenJson.access_token }
      : {}),
  };
}
