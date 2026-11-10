import { EPS, YELLOW_BAND, finite, installment, monthCount, validIncome } from "./mortgage";
import type { HouseInputs, Light } from "./types";

/** Full result of one purchase scenario. All values are unrounded floats (€ or fractions). */
export interface Scenario {
  purchaseCosts: number;
  minDownPayment: number;
  maxDownPayment: number;
  /** Chosen down payment, clamped to [min, max]; equals min when capital is insufficient. */
  downPayment: number;
  /** Capital covers min down payment + costs + furniture/works + emergency fund. */
  capitalSufficient: boolean;
  loan: number;
  needsMortgage: boolean;
  installment: number;
  totalInterest: number;
  totalRepaid: number;
  totalHouseCost: number;
  /** M / R; null when income is missing. */
  installmentToIncome: number | null;
  effectiveLtv: number;
  /** C − down payment − costs − A − F; negative when capital is insufficient. */
  residualLiquidity: number;
  /** max(0, −residualLiquidity) */
  missingCapital: number;
  checks: { capital: Light; installment: Light };
  overall: Light;
  /** True when income is missing (the installment check is n/a for that reason). */
  incomplete: boolean;
}

/** Traffic light for an installment/income ratio against threshold s (yellow band = s − 5 pp). */
export function installmentLight(ratio: number, threshold: number): Light {
  if (ratio <= threshold - YELLOW_BAND + EPS) return "green";
  if (ratio <= threshold + EPS) return "yellow";
  return "red";
}

/** Overall light: red > yellow > green; "na" checks are ignored ("na" only if all are na). */
export function combineLights(lights: Light[]): Light {
  const relevant = lights.filter((l) => l !== "na");
  if (relevant.length === 0) return "na";
  if (relevant.includes("red")) return "red";
  if (relevant.includes("yellow")) return "yellow";
  return "green";
}

/** Computes the complete scenario for the given inputs (see PLAN.md "Modello di calcolo"). */
export function computeScenario(inputs: HouseInputs): Scenario {
  const price = Math.max(0, finite(inputs.price));
  const capital = finite(inputs.capital);
  const extras =
    Math.max(0, finite(inputs.furnitureAndWorks)) + Math.max(0, finite(inputs.emergencyFund));
  const costRate = Math.max(0, finite(inputs.purchaseCostRate));
  const maxLtv = Math.min(1, Math.max(0, finite(inputs.maxLtv)));
  const income = validIncome(inputs.monthlyIncome);

  const purchaseCosts = price * costRate;
  const minDownPayment = price * (1 - maxLtv);
  const available = capital - purchaseCosts - extras;
  const maxDownPayment = Math.min(price, Math.max(0, available));
  // Equivalent to max >= min, but also catches min = 0 with negative available capital.
  const capitalSufficient = available >= minDownPayment - EPS;

  let downPayment: number;
  if (!capitalSufficient) downPayment = minDownPayment;
  else if (inputs.downPayment.mode === "max") downPayment = maxDownPayment;
  else {
    const value = finite(inputs.downPayment.value);
    downPayment = Math.min(maxDownPayment, Math.max(minDownPayment, value));
  }

  let loan = price - downPayment;
  if (loan < EPS) loan = 0;
  const needsMortgage = loan > 0;

  const n = monthCount(inputs.years);
  const monthly = installment(loan, inputs.annualRate, inputs.years);
  const totalRepaid = monthly * n;
  const totalInterest = needsMortgage ? totalRepaid - loan : 0;
  const totalHouseCost = price + purchaseCosts + totalInterest;
  const installmentToIncome = income === null ? null : monthly / income;
  const effectiveLtv = price > 0 ? loan / price : 0;
  const residualLiquidity = capital - downPayment - purchaseCosts - extras;
  const missingCapital = Math.max(0, -residualLiquidity);

  const capitalLight: Light = capitalSufficient ? "green" : "red";
  const installmentCheck: Light =
    installmentToIncome === null || !needsMortgage
      ? "na"
      : installmentLight(installmentToIncome, finite(inputs.maxInstallmentToIncome));

  return {
    purchaseCosts,
    minDownPayment,
    maxDownPayment,
    downPayment,
    capitalSufficient,
    loan,
    needsMortgage,
    installment: monthly,
    totalInterest,
    totalRepaid,
    totalHouseCost,
    installmentToIncome,
    effectiveLtv,
    residualLiquidity,
    missingCapital,
    checks: { capital: capitalLight, installment: installmentCheck },
    overall: combineLights([capitalLight, installmentCheck]),
    incomplete: income === null,
  };
}
