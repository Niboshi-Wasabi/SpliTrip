function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** チュートリアル用プレースホルダーのまま置かれている場合は未設定扱いにする */
function looksLikePlaceholder(url: string, anonKey: string): boolean {
  const combined = `${url} ${anonKey}`.toLowerCase();
  return (
    combined.includes("your-supabase") ||
    combined.includes("xxxxxxxx") ||
    combined.includes("example.supabase")
  );
}

export function getSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

  if (
    !isValidHttpUrl(url) ||
    anonKey.length === 0 ||
    looksLikePlaceholder(url, anonKey)
  ) {
    return null;
  }

  return { url, anonKey };
}

/** ブラウザ・サーバー共通。Supabase 接続に必要な環境変数が揃っているか */
export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() !== null;
}
