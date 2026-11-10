import { describe, expect, it } from "vitest";
import { maxAffordablePrice, maxPriceCurve } from "./max-price";
import { computeScenario } from "./scenario";
import { controlInputs } from "./test-helpers";
import type { HouseInputs } from "./types";

/** Reference: bisection on computeScenario (down payment at max), largest price with no red check. */
function bisectMaxPrice(inputs: HouseInputs, years: number, threshold?: number): number {
  const s = threshold ?? inputs.maxInstallmentToIncome;
  const ok = (price: number) =>
    computeScenario({
      ...inputs,
      price,
      years,
      maxInstallmentToIncome: s,
      downPayment: { mode: "max" },
    }).overall !== "red";
  if (!ok(0)) return 0;
  let lo = 0;
  let hi = 10_000_000;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

describe("maxAffordablePrice", () => {
  it("control values: capital limit ~442.300, max ~278.100 at 25y bound by income", () => {
    const r = maxAffordablePrice(controlInputs(), 25);
    expect(Math.abs(r.capitalLimit - 442_300)).toBeLessThan(50);
    expect(Math.abs(r.price - 278_100)).toBeLessThan(50);
    expect(r.binding).toBe("income");
    expect(r.incomeLimit).toBeCloseTo(r.price, 9);
  });

  const variants: Array<[string, Partial<HouseInputs>]> = [
    ["control", {}],
    ["high income", { monthlyIncome: 10_000 }],
    ["low income", { monthlyIncome: 1_200 }],
    ["missing income", { monthlyIncome: null }],
    ["Spain", { purchaseCostRate: 0.1, maxInstallmentToIncome: 0.35, annualRate: 0.03 }],
    ["rate 0", { annualRate: 0 }],
    ["rich", { capital: 600_000, monthlyIncome: 2_000 }],
  ];
  for (const [name, overrides] of variants) {
    for (const years of [5, 10, 25, 40]) {
      it(`closed form matches bisection: ${name}, ${years}y`, () => {
        const inputs = controlInputs(overrides);
        const r = maxAffordablePrice(inputs, years);
        expect(Math.abs(r.price - bisectMaxPrice(inputs, years))).toBeLessThan(0.01);
        const comfortable = inputs.maxInstallmentToIncome - 0.05;
        const rc = maxAffordablePrice(inputs, years, comfortable);
        expect(Math.abs(rc.price - bisectMaxPrice(inputs, years, comfortable))).toBeLessThan(0.01);
      });
    }
  }

  it("binding constraint is the smaller limit", () => {
    const capitalBound = maxAffordablePrice(controlInputs({ monthlyIncome: 10_000 }), 25);
    expect(capitalBound.binding).toBe("capital");
    expect(capitalBound.price).toBeCloseTo(capitalBound.capitalLimit, 9);
    expect(capitalBound.incomeLimit).toBeGreaterThan(capitalBound.capitalLimit);
    const s = computeScenario(controlInputs({ monthlyIncome: 10_000, price: capitalBound.price }));
    expect(s.missingCapital).toBeCloseTo(0, 4);
  });

  it("missing income: only capital limit", () => {
    const r = maxAffordablePrice(controlInputs({ monthlyIncome: null }), 25);
    expect(r.incomeLimit).toBeNull();
    expect(r.binding).toBe("capital");
    expect(r.price).toBeCloseTo(115_000 / 0.26, 6);
  });

  it("K ≤ 0: no reachable price", () => {
    const r = maxAffordablePrice(controlInputs({ capital: 35_000 }), 25);
    expect(r).toEqual({ price: 0, binding: null, capitalLimit: 0, incomeLimit: 0 });
    expect(maxAffordablePrice(controlInputs({ capital: 0, monthlyIncome: null }), 25).price).toBe(
      0,
    );
  });

  it("both limits are ≥ the cash price K/(1+c)", () => {
    const inputs = controlInputs({ monthlyIncome: 100 });
    const r = maxAffordablePrice(inputs, 10);
    const cash = 115_000 / 1.06;
    expect(r.capitalLimit).toBeGreaterThanOrEqual(cash);
    expect(r.incomeLimit ?? 0).toBeGreaterThanOrEqual(cash);
  });
});

describe("maxPriceCurve", () => {
  it("covers 5..40 years, non-decreasing, comfortable ≤ max", () => {
    for (const overrides of [{}, { monthlyIncome: 10_000 }, { monthlyIncome: null }]) {
      const curve = maxPriceCurve(controlInputs(overrides));
      expect(curve.map((p) => p.years)).toEqual(Array.from({ length: 36 }, (_, i) => i + 5));
      for (let i = 1; i < curve.length; i++) {
        expect(curve[i].maxPrice).toBeGreaterThanOrEqual(curve[i - 1].maxPrice - 1e-6);
        expect(curve[i].comfortablePrice).toBeGreaterThanOrEqual(
          curve[i - 1].comfortablePrice - 1e-6,
        );
      }
      for (const p of curve) expect(p.comfortablePrice).toBeLessThanOrEqual(p.maxPrice + 1e-6);
    }
  });

  it("control: income-bound at short durations, capital-bound eventually with high income", () => {
    const curve = maxPriceCurve(controlInputs({ monthlyIncome: 5_000 }));
    expect(curve[0].binding).toBe("income");
    expect(curve.at(-1)?.binding).toBe("capital");
    expect(curve.at(-1)?.maxPrice).toBeCloseTo(115_000 / 0.26, 6);
  });

  it("LTV 100% and costs 0: no capital limit (Infinity), income binds", () => {
    const inp = controlInputs({ maxLtv: 1, purchaseCostRate: 0 });
    const r = maxAffordablePrice(inp, 25);
    expect(r.capitalLimit).toBe(Infinity);
    expect(r.binding).toBe("income");
    expect(Number.isFinite(r.price)).toBe(true);
    expect(r.price).toBeCloseTo(r.incomeLimit!, 9);
    for (const p of maxPriceCurve(inp)) expect(Number.isFinite(p.maxPrice)).toBe(true);
  });

  it("LTV 100%, costs 0 and no income: price Infinity, no binding", () => {
    const r = maxAffordablePrice(
      controlInputs({ maxLtv: 1, purchaseCostRate: 0, monthlyIncome: null }),
      25,
    );
    expect(r.price).toBe(Infinity);
    expect(r.capitalLimit).toBe(Infinity);
    expect(r.binding).toBeNull();
    expect(r.incomeLimit).toBeNull();
  });

  it("custom range", () => {
    expect(maxPriceCurve(controlInputs(), 10, 12).map((p) => p.years)).toEqual([10, 11, 12]);
  });
});
