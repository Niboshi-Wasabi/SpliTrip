/** LINE 公式の検証 API（Web の id_token は HS256 のため Supabase の OIDC/JWKS 検証と互換にならない場合がある） */
const LINE_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";

export async function verifyLineIdTokenAtLineApi(
  idToken: string,
  channelId: string,
): Promise<
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; reason: string }
> {
  let verifyResponse: Response;
  try {
    verifyResponse = await fetch(LINE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        id_token: idToken,
        client_id: channelId,
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (caughtError) {
    console.error(
      "[API/Action Error - verifyLineIdTokenAtLineApi fetch]:",
      caughtError,
    );
    return { ok: false, reason: "fetch_failed" };
  }

  const responseBody = (await verifyResponse
    .json()
    .catch(() => null)) as Record<string, unknown> | null;

  if (!verifyResponse.ok || !responseBody || typeof responseBody.sub !== "string") {
    console.error(
      "[API/Action Error - verifyLineIdTokenAtLineApi invalid response]:",
      { status: verifyResponse.status, responseBody },
    );
    return { ok: false, reason: "invalid_response" };
  }

  return { ok: true, payload: responseBody };
}
