import { DEFAULT_INPUTS } from "./presets";
import type { HouseInputs } from "./types";

/**
 * Control scenario from docs/PLAN.md "Valori di controllo". The income is pinned to
 * 3.000 € income and 20.000 € furniture and works (the plan's values), so the UI
 * defaults can change without moving the checks.
 */
export function controlInputs(overrides: Partial<HouseInputs> = {}): HouseInputs {
  return { ...DEFAULT_INPUTS, monthlyIncome: 3_000, furnitureAndWorks: 20_000, ...overrides };
}
