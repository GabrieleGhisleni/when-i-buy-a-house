import { describe, expect, it } from "vitest";
import { matrixPrices, priceMatrix } from "./matrix";
import { computeScenario } from "./scenario";
import { controlInputs } from "./test-helpers";

describe("matrixPrices", () => {
  it("200k: 9 rows, raw step 25.000 stays 25.000 (range = exactly ±50%)", () => {
    expect(matrixPrices(200_000)).toEqual([
      100_000, 125_000, 150_000, 175_000, 200_000, 225_000, 250_000, 275_000, 300_000,
    ]);
  });

  it("rounds the step down (5.000 unit below 50.000, else 10.000) with a minimum of 5.000", () => {
    // raw = 12.500 → floor to 10.000
    expect(matrixPrices(100_000)).toEqual([
      60_000, 70_000, 80_000, 90_000, 100_000, 110_000, 120_000, 130_000, 140_000,
    ]);
    // raw = 60.000 → 10.000 unit → 60.000
    expect(matrixPrices(240_000, 1, 9).at(-1)).toBe(240_000 + 4 * 60_000);
    // raw = 2.500 → minimum 5.000 (non-positive prices are dropped)
    expect(matrixPrices(20_000)).toEqual([
      5_000, 10_000, 15_000, 20_000, 25_000, 30_000, 35_000, 40_000,
    ]);
  });

  it("never exceeds the requested spread when the step is above the minimum", () => {
    for (const c of [150_000, 237_000, 410_000, 650_000]) {
      const p = matrixPrices(c);
      expect(p[0]).toBeGreaterThanOrEqual(c * 0.5);
      expect(p.at(-1)!).toBeLessThanOrEqual(c * 1.5);
    }
  });

  it("is ascending, positive, centered, and empty for center 0", () => {
    const p = matrixPrices(400_000, 0.3, 7);
    expect(p).toHaveLength(7);
    expect(p[3]).toBe(400_000);
    expect([...p].sort((a, b) => a - b)).toEqual(p);
    expect(p.every((x) => x > 0)).toBe(true);
    expect(matrixPrices(0)).toEqual([]);
    expect(matrixPrices(-1)).toEqual([]);
  });
});

describe("priceMatrix", () => {
  it("each cell equals the scenario at max down payment", () => {
    const inputs = controlInputs({ downPayment: { mode: "custom", value: 50_000 } });
    const prices = [200_000, 400_000];
    const durations = [10, 30];
    const m = priceMatrix(inputs, prices, durations);
    expect(m).toHaveLength(2);
    expect(m[0]).toHaveLength(2);
    expect(m[0][0].loan).toBeCloseTo(97_000, 6);
    expect(Math.abs(m[0][0].installment - 959)).toBeLessThan(1);
    expect(Math.abs(m[1][1].installment - 1_388)).toBeLessThan(1);
    for (const row of m) {
      for (const cell of row) {
        const s = computeScenario({
          ...inputs,
          price: cell.price,
          years: cell.years,
          downPayment: { mode: "max" },
        });
        expect(cell).toEqual({
          price: cell.price,
          years: cell.years,
          installment: s.installment,
          totalInterest: s.totalInterest,
          installmentToIncome: s.installmentToIncome,
          overall: s.overall,
          loan: s.loan,
        });
      }
    }
    expect(m[1][0].overall).toBe("red");
  });
});
