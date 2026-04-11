/**
 * Fetch exchange rates from a free, key-less API and cache server-side.
 * 無料・キー不要の API から為替レートを取得し、サーバー側でキャッシュする。
 *
 * Why `open.er-api.com`: free tier with no API key required, supports 150+ currencies,
 * and has generous rate limits suitable for a travel expense app.
 * 理由: API キー不要の無料枠、150 以上の通貨に対応、旅行精算アプリに十分なレート制限。
 *
 * Why `revalidate: 3600`: exchange rates are refreshed hourly.
 * One hour balances freshness with API rate limit avoidance.
 * 理由: 1 時間ごとにレートを更新し、鮮度と API 制限回避のバランスを取る。
 */

const EXCHANGE_API_BASE = "https://open.er-api.com/v6/latest";

/**
 * 1 時間キャッシュ。ISR のように `next/cache` の `revalidate` に相当する。
 * Cache for 1 hour. Equivalent to `revalidate` in `next/cache`.
 */
const CACHE_TTL_MS = 60 * 60 * 1000;

type CacheEntry = {
  rates: Record<string, number>;
  fetchedAt: number;
};

const rateCache = new Map<string, CacheEntry>();

export type ExchangeRateResult =
  | { ok: true; rates: Record<string, number> }
  | { ok: false; error: string };

/**
 * 指定した基準通貨に対するレートマップを返す。
 * Returns a rate map for the given base currency.
 *
 * @param baseCurrency - ISO 4217 code, e.g. "JPY", "USD"
 */
export async function fetchExchangeRates(
  baseCurrency: string,
): Promise<ExchangeRateResult> {
  const normalizedBase = baseCurrency.trim().toUpperCase();

  const cached = rateCache.get(normalizedBase);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { ok: true, rates: cached.rates };
  }

  try {
    const response = await fetch(`${EXCHANGE_API_BASE}/${normalizedBase}`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return { ok: false, error: `API responded with ${response.status}` };
    }

    const payload = (await response.json()) as {
      result?: string;
      rates?: Record<string, number>;
    };

    if (payload.result !== "success" || !payload.rates) {
      return { ok: false, error: "Unexpected API response format" };
    }

    const entry: CacheEntry = {
      rates: payload.rates,
      fetchedAt: Date.now(),
    };
    rateCache.set(normalizedBase, entry);

    return { ok: true, rates: payload.rates };
  } catch (caughtError) {
    console.error(
      "[API/Action Error - fetchExchangeRates fetch]:",
      caughtError,
    );
    return { ok: false, error: "exchange_rate_fetch_failed" };
  }
}

/**
 * 金額を別通貨に換算する。レートが取得できない場合は null を返す。
 * Convert an amount to another currency. Returns null if the rate is unavailable.
 *
 * @param amount       - 換算元の金額 / source amount
 * @param fromCurrency - 換算元の通貨コード / source currency ISO code
 * @param toCurrency   - 換算先の通貨コード / target currency ISO code
 * @param rates        - fetchExchangeRates() で取得した rates マップ（fromCurrency 基準）
 *                       rates map from fetchExchangeRates() (keyed off fromCurrency)
 */
export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>,
): number | null {
  const from = fromCurrency.trim().toUpperCase();
  const to = toCurrency.trim().toUpperCase();

  if (from === to) return amount;

  const targetRate = rates[to];
  if (typeof targetRate !== "number" || targetRate <= 0) return null;

  return Math.round(amount * targetRate * 100) / 100;
}
