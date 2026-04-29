/**
 * Evaluates a restricted arithmetic expression for amount entry (e.g. "1500*2", "(100+50)*2").
 * Only digits, decimal points, parentheses, and + - * / are allowed (plus spaces, stripped before check).
 * Uses `new Function` only after the whitelist check — not arbitrary `eval` of user text.
 */
export function evaluateRestrictedAmountExpression(raw: string):
  | { ok: true; value: number }
  | { ok: false } {
  const compact = raw.trim().replace(/\s+/g, "");
  if (!compact) {
    return { ok: false };
  }

  const hasOperator = /[+\-*/()]/.test(compact);
  if (!hasOperator) {
    const direct = Number(compact);
    if (Number.isFinite(direct)) {
      return { ok: true, value: direct };
    }
    return { ok: false };
  }

  if (!/^[\d.+\-*/()]+$/.test(compact)) {
    return { ok: false };
  }

  try {
    // Caller string is whitelist-validated (`^[\d.+\-*/()]+$`); avoids arbitrary code execution beyond arithmetic.
    // eslint-disable-next-line no-new-func -- restricted expression only
    const result = new Function(`"use strict"; return (${compact})`)() as unknown;
    if (typeof result !== "number" || !Number.isFinite(result)) {
      return { ok: false };
    }
    return { ok: true, value: result };
  } catch {
    return { ok: false };
  }
}
