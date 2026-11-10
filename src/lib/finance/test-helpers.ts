import { DEFAULT_INPUTS } from "./presets";
import type { HouseInputs } from "./types";

/**
 * Control scenario from PLAN.md "Valori di controllo". The income is pinned to
 * 3.000 € (the plan's value), so the UI default can change without moving the checks.
 */
export function controlInputs(overrides: Partial<HouseInputs> = {}): HouseInputs {
  return { ...DEFAULT_INPUTS, monthlyIncome: 3_000, ...overrides };
}
