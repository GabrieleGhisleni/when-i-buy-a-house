/** Tolerance used for floating-point comparisons in the feasibility checks. */
export const EPS = 1e-9;

/** Yellow band width below the installment/income threshold (5 percentage points). */
export const YELLOW_BAND = 0.05;

/** Number of monthly payments for a duration in years (at least 1). */
export function monthCount(years: number): number {
  const n = Math.round(finite(years) * 12);
  return Math.max(1, n);
}

/**
 * k: monthly installment per 1 € of loan (French amortization).
 * k = i / (1 − (1 + i)^−n), i = annualRate / 12, n = years × 12; with rate 0, k = 1 / n.
 */
export function monthlyFactor(annualRate: number, years: number): number {
  const n = monthCount(years);
  const i = finite(annualRate) / 12;
  if (Math.abs(i) < 1e-12) return 1 / n;
  return i / (1 - (1 + i) ** -n);
}

/** M = L × k: constant monthly installment. Non-positive loans give 0. */
export function installment(loan: number, annualRate: number, years: number): number {
  if (!(loan > 0)) return 0;
  return loan * monthlyFactor(annualRate, years);
}

/** Replaces NaN/±Infinity with 0. */
export function finite(x: number): number {
  return Number.isFinite(x) ? x : 0;
}

/** Valid monthly income (> 0 and finite), or null when missing. */
export function validIncome(income: number | null | undefined): number | null {
  return typeof income === "number" && Number.isFinite(income) && income > 0 ? income : null;
}
