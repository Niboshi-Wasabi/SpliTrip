export async function verifyTurnstileTokenOnServer(
  token: string,
): Promise<boolean> {
  const response = await fetch("/api/security/turnstile/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    return false;
  }

  const payload = (await response.json()) as { success?: boolean };
  return payload.success === true;
}
