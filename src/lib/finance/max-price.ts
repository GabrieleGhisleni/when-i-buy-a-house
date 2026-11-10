import { YELLOW_BAND, finite, monthlyFactor, validIncome } from "./mortgage";
import type { Binding, HouseInputs } from "./types";

/** Highest reachable price for one duration, with the binding constraint. */
export interface MaxPrice {
  /** Highest price; `Infinity` when neither capital nor income limits it (no income, no capital limit). */
  price: number;
  /**
   * Which limit binds (ties → "capital"); null when no price is reachable (K ≤ 0)
   * or when there is no limit at all (price = Infinity).
   */
  binding: Binding | null;
  /**
   * P_capital = K / (1 − LTV + c); independent of duration.
   * `Infinity` means "no capital limit" (LTV 100% and purchase costs 0: nothing needs
   * to be paid up front, so capital does not cap the price).
   */
  capitalLimit: number;
  /** P_income = (s·R/k + K) / (1 + c); null when income is missing. */
  incomeLimit: number | null;
}

/** One point of the max-price curve. */
export interface MaxPricePoint {
  years: number;
  maxPrice: number;
  /** Max price with the "comfortable" threshold s − 5 pp (green). */
  comfortablePrice: number;
  binding: Binding | null;
}

/**
 * Closed-form highest price P with no red check, down payment at max.
 * K = C − A − F; price = min(P_capital, P_income). `threshold` overrides s.
 */
export function maxAffordablePrice(
  inputs: HouseInputs,
  years: number,
  threshold?: number,
): MaxPrice {
  const s = Math.max(0, finite(threshold ?? inputs.maxInstallmentToIncome));
  const c = Math.max(0, finite(inputs.purchaseCostRate));
  const ltv = Math.min(1, Math.max(0, finite(inputs.maxLtv)));
  const income = validIncome(inputs.monthlyIncome);
  const K =
    finite(inputs.capital) -
    Math.max(0, finite(inputs.furnitureAndWorks)) -
    Math.max(0, finite(inputs.emergencyFund));

  if (K <= 0) {
    return { price: 0, binding: null, capitalLimit: 0, incomeLimit: income === null ? null : 0 };
  }

  // 1 − LTV + c = 0 (LTV 100% and no costs): no capital limit.
  const denom = 1 - ltv + c;
  const capitalLimit = denom <= 1e-12 ? Infinity : K / denom;
  if (income === null) {
    return {
      price: capitalLimit,
      binding: Number.isFinite(capitalLimit) ? "capital" : null,
      capitalLimit,
      incomeLimit: null,
    };
  }
  const k = monthlyFactor(inputs.annualRate, years);
  const incomeLimit = ((s * income) / k + K) / (1 + c);
  const binding: Binding = capitalLimit <= incomeLimit ? "capital" : "income";
  return { price: Math.min(capitalLimit, incomeLimit), binding, capitalLimit, incomeLimit };
}

/** Max price and comfortable (s − 5 pp) max price for each integer duration in [minYears, maxYears]. */
export function maxPriceCurve(inputs: HouseInputs, minYears = 5, maxYears = 40): MaxPricePoint[] {
  const comfortable = Math.max(0, finite(inputs.maxInstallmentToIncome) - YELLOW_BAND);
  const points: MaxPricePoint[] = [];
  for (let years = Math.ceil(minYears); years <= maxYears; years++) {
    const max = maxAffordablePrice(inputs, years);
    points.push({
      years,
      maxPrice: max.price,
      comfortablePrice: maxAffordablePrice(inputs, years, comfortable).price,
      binding: max.binding,
    });
  }
  return points;
}
