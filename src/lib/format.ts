const LOCALE = "it-IT";

function numberFormat(minDecimals: number, maxDecimals: number): Intl.NumberFormat {
  // useGrouping "always": it-IT omits the separator for 4-digit numbers by default (1500).
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
    useGrouping: "always",
  });
}

/** Number with it-IT separators and a fixed number of decimals (e.g. 200.000,50). */
export function formatNumberIt(n: number, decimals = 0): string {
  return numberFormat(decimals, decimals).format(n);
}

/** Euro amount, e.g. "200.000 €". Default 0 decimals. */
export function formatEur(n: number, opts: { decimals?: number } = {}): string {
  const decimals = opts.decimals ?? 0;
  return `${formatNumberIt(n, decimals)} €`;
}

/** Fraction as percentage, e.g. 0.035 -> "3,5%". */
export function formatPct(fraction: number, decimals = 1): string {
  return `${formatNumberIt(fraction * 100, decimals)}%`;
}

/**
 * Parses a number typed in Italian style. Returns null if not a valid number.
 * Rules:
 * - spaces, non-breaking spaces, "€" and "%" are ignored;
 * - a comma is always the decimal separator ("3,5" -> 3.5, "200.000,50" -> 200000.5);
 * - without a comma, dots are thousands separators when there are several dots
 *   or a single dot is followed by exactly 3 digits ("200.000" -> 200000);
 *   otherwise a single dot is a decimal point ("1.5" -> 1.5, "3.25" -> 3.25).
 *   Consequence: "1.500" is read as 1500, never as 1.5.
 * - a dot is never a thousands separator when the integer part is 0 or starts
 *   with 0 ("0.035" -> 0.035);
 * - with `{ percent: true }` (fields without thousands, like 3.5 or 0.125) a
 *   single dot is always a decimal point.
 */
export function parseItNumber(text: string, opts: { percent?: boolean } = {}): number | null {
  let s = text.replace(/[\s €%]/g, "");
  if (s === "") return null;
  let sign = 1;
  if (s.startsWith("-")) {
    sign = -1;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  }
  let normalized: string;
  if (s.includes(",")) {
    const parts = s.split(",");
    if (parts.length !== 2) return null;
    const [intPart, frac] = parts;
    if (!/^\d{1,3}(\.\d{3})*$|^\d*$/.test(intPart) || !/^\d*$/.test(frac)) return null;
    normalized = `${intPart.replace(/\./g, "") || "0"}.${frac || "0"}`;
  } else if (s.includes(".")) {
    const dots = s.split(".").length - 1;
    const leadingZero = /^0*\./.test(s) || /^0\d/.test(s);
    if (dots === 1 && (opts.percent || leadingZero)) {
      if (!/^\d*\.\d+$/.test(s)) return null;
      normalized = s.startsWith(".") ? `0${s}` : s;
    } else if (dots > 1 || /^\d+\.\d{3}$/.test(s)) {
      if (!/^\d{1,3}(\.\d{3})+$/.test(s)) return null;
      normalized = s.replace(/\./g, "");
    } else {
      if (!/^\d*\.\d+$/.test(s)) return null;
      normalized = s.startsWith(".") ? `0${s}` : s;
    }
  } else {
    if (!/^\d+$/.test(s)) return null;
    normalized = s;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? sign * value : null;
}
