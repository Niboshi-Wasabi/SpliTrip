/**
 * Periodic health probes for public system status (`system_status`).
 * 定期ジョブ（GitHub Actions など）から呼ぶ。サービスキー単位で Supabase・Stripe・Gemini を軽く叩く。
 */
import { GoogleGenAI } from "@google/genai";
import Stripe from "stripe";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import type { SystemOperationalStatus, SystemStatusServiceKey } from "@/lib/system-status";

const PROBE_TIMEOUT_MS = 8000;
const GEMINI_HEALTH_MODEL_DEFAULT = "gemini-2.0-flash";

function timedProbe<T>(
  label: SystemStatusServiceKey,
  run: () => Promise<T>,
): Promise<T | null> {
  return new Promise<T | null>((resolve) => {
    const timerReference = setTimeout(() => resolve(null), PROBE_TIMEOUT_MS);
    run()
      .then((result) => {
        clearTimeout(timerReference);
        resolve(result);
      })
      .catch((probeError: unknown) => {
        clearTimeout(timerReference);
        console.error(`[system-status-probe:${label}]`, probeError);
        resolve(null);
      });
  });
}

async function probeCoreApiDatabase(): Promise<SystemOperationalStatus> {
  const result = await timedProbe("core_api_database", async () => {
    const supabase = createServiceRoleClient();
    const response = await supabase.from("system_status").select("service_key").limit(1);
    if (response.error) {
      throw response.error;
    }
    return "operational" as const;
  });
  if (result === null) {
    return "major_outage";
  }
  return result;
}

async function probeAuthentication(): Promise<SystemOperationalStatus> {
  const result = await timedProbe("authentication", async () => {
    const supabase = createServiceRoleClient();
    const authResponse = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });
    if (authResponse.error) {
      throw authResponse.error;
    }
    return "operational" as const;
  });
  if (result === null) {
    return "major_outage";
  }
  return result;
}

async function probeStripePayments(): Promise<SystemOperationalStatus> {
  const stripeSecretKey = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  if (!stripeSecretKey) {
    return "operational";
  }
  const outcome = await timedProbe("stripe_payments", async () => {
    const stripeClient = new Stripe(stripeSecretKey, {
      timeout: PROBE_TIMEOUT_MS,
      maxNetworkRetries: 0,
      appInfo: { name: "SpliTrip system-status cron" },
    });
    await stripeClient.balance.retrieve();
    return "operational" as const;
  });
  if (outcome === null) {
    return "partial_outage";
  }
  return outcome;
}

async function probeReceiptAi(): Promise<SystemOperationalStatus> {
  const apiKey = (process.env.GEMINI_API_KEY ?? "").trim();
  if (!apiKey) {
    return "operational";
  }
  const modelName = (
    process.env.GEMINI_MODEL ?? GEMINI_HEALTH_MODEL_DEFAULT
  ).trim();
  if (!modelName) {
    return "degraded";
  }
  const outcome = await timedProbe("receipt_ai", async () => {
    const client = new GoogleGenAI({ apiKey });
    await client.models.generateContent({
      model: modelName,
      contents: 'Reply with exactly the word ok.',
    });
    return "operational" as const;
  });
  if (outcome === null) {
    return "degraded";
  }
  return outcome;
}

async function probeWebPushNotifications(): Promise<SystemOperationalStatus> {
  /**
   * 送信パイプラインは Route で 501 プレースホルダ。プローブ対象となる外部 URL が無いため常に正常扱い。
   */
  return "operational";
}

/** 全サービスのプローブ結果（DB への書き込みは行わない）。 */
export async function runSystemStatusHealthProbes(): Promise<
  Record<SystemStatusServiceKey, SystemOperationalStatus>
> {
  const [
    coreApiDatabase,
    authentication,
    stripePayments,
    receiptAi,
    webPushNotifications,
  ] = await Promise.all([
    probeCoreApiDatabase(),
    probeAuthentication(),
    probeStripePayments(),
    probeReceiptAi(),
    probeWebPushNotifications(),
  ]);
  return {
    core_api_database: coreApiDatabase,
    authentication: authentication,
    stripe_payments: stripePayments,
    receipt_ai: receiptAi,
    web_push_notifications: webPushNotifications,
  };
}
