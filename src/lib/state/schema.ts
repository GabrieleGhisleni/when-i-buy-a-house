import { z } from "zod";
import type { HouseInputs } from "@/lib/finance";

export const STATE_VERSION = 1;

const money = z.number().finite().min(0).max(1e10);
const fraction = z.number().finite().min(0).max(1);

export const inputsSchema = z.object({
  country: z.enum(["IT", "ES"]),
  capital: money,
  monthlyIncome: money.nullable(),
  price: money,
  furnitureAndWorks: money,
  emergencyFund: money,
  purchaseCostRate: fraction,
  maxLtv: fraction,
  maxInstallmentToIncome: fraction,
  annualRate: fraction,
  years: z.number().int().min(5).max(40),
  downPayment: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("max") }),
    z.object({ mode: z.literal("custom"), value: money }),
  ]),
});

export const stateSchema = z.object({
  version: z.literal(STATE_VERSION),
  inputs: inputsSchema,
});

export type PersistedState = z.infer<typeof stateSchema>;

// Compile-time check that the schema mirrors HouseInputs.
type _Mirrors =
  z.infer<typeof inputsSchema> extends HouseInputs
    ? HouseInputs extends z.infer<typeof inputsSchema>
      ? true
      : never
    : never;
export const _schemaMirrorsTypes: _Mirrors = true;

/** Migration hook: upgrade older persisted shapes to the current one. No older versions exist yet. */
function migrate(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  // Example for the future: if (raw.version === 1) raw = migrateV1toV2(raw);
  return raw;
}

/** Validates (and migrates) unknown data. Returns null if invalid. */
export function parseState(raw: unknown): PersistedState | null {
  const result = stateSchema.safeParse(migrate(raw));
  return result.success ? result.data : null;
}

export function serializeState(inputs: HouseInputs): PersistedState {
  return { version: STATE_VERSION, inputs };
}
