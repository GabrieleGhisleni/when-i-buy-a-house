import type { Country, CountryPreset, HouseInputs } from "./types";

export const COUNTRY_PRESETS: Record<Country, CountryPreset> = {
  IT: { purchaseCostRate: 0.06, maxLtv: 0.8, maxInstallmentToIncome: 0.3, annualRate: 0.035 },
  ES: { purchaseCostRate: 0.1, maxLtv: 0.8, maxInstallmentToIncome: 0.35, annualRate: 0.03 },
};

export const DEFAULT_INPUTS: HouseInputs = {
  country: "IT",
  capital: 150_000,
  monthlyIncome: 3_000,
  price: 200_000,
  furnitureAndWorks: 20_000,
  emergencyFund: 15_000,
  ...COUNTRY_PRESETS.IT,
  years: 25,
  downPayment: { mode: "max" },
};

/** Returns inputs with the given country's preset values applied. */
export function applyCountryPreset(inputs: HouseInputs, country: Country): HouseInputs {
  return { ...inputs, country, ...COUNTRY_PRESETS[country] };
}
