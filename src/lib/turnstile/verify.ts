import { getTurnstileSecretKey } from "@/utils/turnstile/env";

type TurnstileVerifyResult = {
  success: boolean;
  "error-codes"?: string[];
};

export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string,
): Promise<boolean> {
  const secret = getTurnstileSecretKey();
  if (!secret || !token.trim()) {
    return false;
  }

  const form = new URLSearchParams({
    secret,
    response: token,
  });

  if (remoteIp) {
    form.set("remoteip", remoteIp);
  }

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return false;
    }

    const result = (await response.json()) as TurnstileVerifyResult;
    return result.success === true;
  } catch (error) {
    console.error("[API/Action Error - verifyTurnstileToken]:", error);
    return false;
  }
}
