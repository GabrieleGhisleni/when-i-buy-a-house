import { installment } from "./mortgage";

/** One cell of the rate × duration matrix (loan amount fixed to the current scenario). */
export interface RateMatrixCell {
  annualRate: number;
  years: number;
  installment: number;
  totalInterest: number;
}

/**
 * Interest-rate rows centered on `centerRate`, step `step` (fraction, 0.005 = 0.5 pp).
 * Rates must stay positive and are rounded to 4 decimals of a percentage point to avoid
 * floating-point noise. Ascending; empty when the center is not a finite number.
 */
export function rateMatrixRates(centerRate: number, step = 0.005, rows = 9): number[] {
  if (!Number.isFinite(centerRate)) return [];
  const count = Math.max(1, Math.floor(rows));
  const half = (count - 1) / 2;
  const rates: number[] = [];
  for (let j = 0; j < count; j++) {
    const r = Math.round((centerRate + (j - half) * step) * 1e6) / 1e6;
    if (r > 0 && !rates.includes(r)) rates.push(r);
  }
  return rates.sort((a, b) => a - b);
}

/** Matrix [rate row][duration column] of monthly installments for a fixed loan amount. */
export function rateMatrix(loan: number, rates: number[], durations: number[]): RateMatrixCell[][] {
  return rates.map((annualRate) =>
    durations.map((years) => {
      const monthly = installment(loan, annualRate, years);
      const months = Math.max(1, Math.round(years * 12));
      return {
        annualRate,
        years,
        installment: monthly,
        totalInterest: loan > 0 ? monthly * months - loan : 0,
      };
    }),
  );
}
