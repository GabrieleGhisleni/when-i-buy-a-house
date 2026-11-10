import { DEFAULT_INPUTS } from "./presets";
import type { HouseInputs } from "./types";

/** Control scenario from PLAN.md "Valori di controllo". */
export function controlInputs(overrides: Partial<HouseInputs> = {}): HouseInputs {
  return { ...DEFAULT_INPUTS, ...overrides };
}
