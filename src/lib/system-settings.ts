/**
 * public.system_settings から anon キーで読む（Edge / サーバ共通）。
 * RLS: maintenance_* / promo_banner_config の SELECT のみ。
 * 未マイグレーション等で失敗しても表示は壊さない（空／既定値）。空の error オブジェクトはログしない。
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type MaintenanceModeValue = { enabled?: boolean };
type MaintenanceBannerValue = { message?: string };
type PromoBannerValue = {
  href?: string;
  imageUrl?: string;
  labelJa?: string;
  labelEn?: string;
};

function getPostgrestErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const messageValue = (error as { message: unknown }).message;
    if (typeof messageValue === "string" && messageValue.length > 0) {
      return messageValue;
    }
  }
  return "";
}

function logSettingsReadDebug(scope: string, error: unknown): void {
  const postgrestErrorMessage = getPostgrestErrorMessage(error);
  if (!postgrestErrorMessage) {
    return;
  }
  if (process.env.NODE_ENV === "development") {
    console.warn(`[${scope}]`, postgrestErrorMessage);
  }
}

function getAnonReadClient(): SupabaseClient | null {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  if (!url || !key) {
    return null;
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getMaintenanceModeFromDatabase(): Promise<boolean> {
  const supabase = getAnonReadClient();
  if (!supabase) {
    return false;
  }
  const { data, error } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "maintenance_mode")
    .maybeSingle();
  if (error) {
    logSettingsReadDebug("getMaintenanceModeFromDatabase", error);
    return false;
  }
  const maintenanceModeValue = (data?.value as MaintenanceModeValue | null) ?? null;
  return maintenanceModeValue?.enabled === true;
}

export async function getMaintenanceBannerMessageFromDatabase(): Promise<string> {
  const supabase = getAnonReadClient();
  if (!supabase) {
    return "";
  }
  const { data, error } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "maintenance_announcement")
    .maybeSingle();
  if (error) {
    logSettingsReadDebug("getMaintenanceBannerMessageFromDatabase", error);
    return "";
  }
  const maintenanceBannerValue = (data?.value as MaintenanceBannerValue | null) ?? null;
  const text = (maintenanceBannerValue?.message ?? "").trim();
  return text;
}

export async function getPromoBannerConfigFromDatabase(): Promise<PromoBannerValue | null> {
  const supabase = getAnonReadClient();
  if (!supabase) {
    return null;
  }
  const { data, error } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "promo_banner_config")
    .maybeSingle();
  if (error) {
    logSettingsReadDebug("getPromoBannerConfigFromDatabase", error);
    return null;
  }
  if (!data?.value || typeof data.value !== "object") {
    return null;
  }
  return data.value as PromoBannerValue;
}
