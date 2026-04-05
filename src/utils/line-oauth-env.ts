function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export type LineOAuthEnv = {
  channelId: string;
  channelSecret: string;
  redirectUri: string;
};

/** LINE ログインに必要なサーバー側・公開リダイレクト URI が揃っているか */
export function getLineOAuthEnv(): LineOAuthEnv | null {
  const channelId = (process.env.LINE_CHANNEL_ID ?? "").trim();
  const channelSecret = (process.env.LINE_CHANNEL_SECRET ?? "").trim();
  const redirectUri = (process.env.NEXT_PUBLIC_LINE_REDIRECT_URI ?? "").trim();

  if (!channelId || !channelSecret || !isValidHttpUrl(redirectUri)) {
    return null;
  }

  return { channelId, channelSecret, redirectUri };
}
