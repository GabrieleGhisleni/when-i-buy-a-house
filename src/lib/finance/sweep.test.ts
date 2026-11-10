import { describe, expect, it } from "vitest";
import { downPaymentSweep } from "./sweep";
import { controlInputs } from "./test-helpers";

describe("downPaymentSweep", () => {
  it("goes evenly from min to max down payment", () => {
    const pts = downPaymentSweep(controlInputs(), 21);
    expect(pts).toHaveLength(21);
    expect(pts[0].downPayment).toBeCloseTo(40_000, 6);
    expect(pts.at(-1)?.downPayment).toBeCloseTo(103_000, 6);
    expect(pts[1].downPayment - pts[0].downPayment).toBeCloseTo(63_000 / 20, 6);
    expect(pts[0].residualLiquidity).toBeCloseTo(63_000, 6);
    expect(pts.at(-1)?.residualLiquidity).toBeCloseTo(0, 6);
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i].installment).toBeLessThan(pts[i - 1].installment);
      expect(pts[i].totalInterest).toBeLessThan(pts[i - 1].totalInterest);
    }
  });

  it("insufficient capital: single point at min down payment", () => {
    const pts = downPaymentSweep(controlInputs({ price: 500_000 }));
    expect(pts).toHaveLength(1);
    expect(pts[0].downPayment).toBeCloseTo(100_000, 6);
    expect(pts[0].residualLiquidity).toBeCloseTo(-15_000, 6);
  });
});
