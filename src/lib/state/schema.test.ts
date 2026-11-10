import { describe, expect, it } from "vitest";
import { DEFAULT_INPUTS } from "@/lib/finance/presets";
import { parseState, serializeState } from "./schema";

describe("parseState", () => {
  it("accepts the default state", () => {
    expect(parseState(serializeState(DEFAULT_INPUTS))).toEqual({
      version: 1,
      inputs: DEFAULT_INPUTS,
    });
  });
  it("accepts null income and custom down payment", () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      monthlyIncome: null,
      downPayment: { mode: "custom" as const, value: 50000 },
    };
    expect(parseState({ version: 1, inputs })?.inputs).toEqual(inputs);
  });
  it.each([
    ["non-object", 42],
    ["null", null],
    ["missing version", { inputs: DEFAULT_INPUTS }],
    ["future version", { version: 2, inputs: DEFAULT_INPUTS }],
    ["negative money", { version: 1, inputs: { ...DEFAULT_INPUTS, capital: -1 } }],
    ["rate > 1", { version: 1, inputs: { ...DEFAULT_INPUTS, annualRate: 3.5 } }],
    ["years out of range", { version: 1, inputs: { ...DEFAULT_INPUTS, years: 50 } }],
    ["non-integer years", { version: 1, inputs: { ...DEFAULT_INPUTS, years: 20.5 } }],
    ["bad country", { version: 1, inputs: { ...DEFAULT_INPUTS, country: "FR" } }],
    ["bad down payment", { version: 1, inputs: { ...DEFAULT_INPUTS, downPayment: { mode: "x" } } }],
    ["missing field", { version: 1, inputs: { country: "IT" } }],
  ])("rejects %s", (_name, raw) => {
    expect(parseState(raw)).toBeNull();
  });
});
