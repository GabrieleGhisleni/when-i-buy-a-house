import { computeScenario } from "./scenario";
import type { HouseInputs } from "./types";

/** One point of the down payment ↔ installment sweep. */
export interface DownPaymentPoint {
  downPayment: number;
  installment: number;
  totalInterest: number;
  residualLiquidity: number;
}

/**
 * Evenly spaced down payments from min to max (inclusive).
 * Single point at min when capital is insufficient (or min = max).
 */
export function downPaymentSweep(inputs: HouseInputs, steps = 21): DownPaymentPoint[] {
  const base = computeScenario(inputs);
  const { minDownPayment: min, maxDownPayment: max } = base;
  const single = !base.capitalSufficient || max - min < 1e-6;
  const count = single ? 1 : Math.max(2, Math.floor(steps));
  const points: DownPaymentPoint[] = [];
  for (let j = 0; j < count; j++) {
    const value = count === 1 ? min : min + ((max - min) * j) / (count - 1);
    const s = computeScenario({ ...inputs, downPayment: { mode: "custom", value } });
    points.push({
      downPayment: s.downPayment,
      installment: s.installment,
      totalInterest: s.totalInterest,
      residualLiquidity: s.residualLiquidity,
    });
  }
  return points;
}
