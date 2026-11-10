import type { HouseInputs, Scenario } from "@/lib/finance";

/** Props every view in src/components/views receives from App.tsx. */
export interface ViewProps {
  inputs: HouseInputs;
  scenario: Scenario;
  /** Merge a partial change into the inputs (e.g. load a matrix cell: update({ price, years })). */
  update: (patch: Partial<HouseInputs>) => void;
}
