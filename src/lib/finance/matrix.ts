import { computeScenario } from "./scenario";
import type { HouseInputs, Light } from "./types";

/** One cell of the price × duration matrix (down payment always at max). */
export interface MatrixCell {
  price: number;
  years: number;
  installment: number;
  totalInterest: number;
  installmentToIncome: number | null;
  overall: Light;
  loan: number;
}

/**
 * Matrix rows: `rows` prices centered on `centerPrice`, from −spread to +spread.
 * Step = 2·spread·center/(rows − 1), rounded DOWN to a multiple of 5.000 € if < 50.000 else of
 * 10.000 € (min 5.000), so the range never exceeds the requested spread (200k ±50% → 100k..300k).
 * Ascending, only positive prices; empty when center ≤ 0.
 */
export function matrixPrices(centerPrice: number, spread = 0.5, rows = 9): number[] {
  if (!Number.isFinite(centerPrice) || centerPrice <= 0) return [];
  const count = Math.max(1, Math.floor(rows));
  if (count === 1) return [centerPrice];
  const raw = (2 * Math.max(0, spread) * centerPrice) / (count - 1);
  const unit = raw < 50_000 ? 5_000 : 10_000;
  const step = Math.max(5_000, Math.floor(raw / unit) * unit);
  const half = (count - 1) / 2;
  const prices: number[] = [];
  for (let j = 0; j < count; j++) {
    const p = centerPrice + (j - half) * step;
    if (p > 0 && !prices.includes(p)) prices.push(p);
  }
  return prices.sort((a, b) => a - b);
}

/** Matrix [price row][duration column], each cell computed with down payment at max. */
export function priceMatrix(
  inputs: HouseInputs,
  prices: number[],
  durations: number[],
): MatrixCell[][] {
  return prices.map((price) =>
    durations.map((years) => {
      const s = computeScenario({ ...inputs, price, years, downPayment: { mode: "max" } });
      return {
        price,
        years,
        installment: s.installment,
        totalInterest: s.totalInterest,
        installmentToIncome: s.installmentToIncome,
        overall: s.overall,
        loan: s.loan,
      };
    }),
  );
}
