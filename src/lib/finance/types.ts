// Shared contract between the finance engine (src/lib/finance) and the UI/state layer.
// Owned by the orchestrator: change only with a note in docs/PROGRESS.md.

export type Country = "IT" | "ES";

/** Down payment choice: always the max available, or a custom value (clamped to [min, max] on every computation). */
export type DownPaymentChoice = { mode: "max" } | { mode: "custom"; value: number };

/** All user inputs. Percentages are fractions (0.06 = 6%). Money in €. */
export interface HouseInputs {
  country: Country;
  /** C: capital available today */
  capital: number;
  /** R: net monthly income; null = missing */
  monthlyIncome: number | null;
  /** P: house price */
  price: number;
  /** A: furniture + renovation, absolute € */
  furnitureAndWorks: number;
  /** F: emergency fund, absolute € */
  emergencyFund: number;
  /** c: purchase costs as fraction of price */
  purchaseCostRate: number;
  /** LTV: max loan-to-value fraction */
  maxLtv: number;
  /** s: max installment/income fraction */
  maxInstallmentToIncome: number;
  /** fixed annual interest rate as fraction (0.035 = 3.5%) */
  annualRate: number;
  /** mortgage duration in years, 5..40 */
  years: number;
  downPayment: DownPaymentChoice;
}

/** Country preset: values applied when the country changes or "Ripristina preset paese" is used. */
export interface CountryPreset {
  purchaseCostRate: number;
  maxLtv: number;
  maxInstallmentToIncome: number;
  annualRate: number;
}

export type Light = "green" | "yellow" | "red" | "na";

export type Binding = "capital" | "income";
