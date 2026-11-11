import { describe, expect, it } from "vitest";
import { rateMatrix, rateMatrixRates } from "./rate-matrix";
import { installment } from "./mortgage";

describe("rateMatrixRates", () => {
  it("centers 9 rows on the current rate in 0.5 pp steps", () => {
    expect(rateMatrixRates(0.035)).toEqual([
      0.015, 0.02, 0.025, 0.03, 0.035, 0.04, 0.045, 0.05, 0.055,
    ]);
  });

  it("drops non-positive rates and handles invalid centers", () => {
    expect(rateMatrixRates(0.005).every((r) => r > 0)).toBe(true);
    expect(rateMatrixRates(Number.NaN)).toEqual([]);
  });
});

describe("rateMatrix", () => {
  it("cells equal the French installment for the fixed loan", () => {
    const m = rateMatrix(100_000, [0.03, 0.04], [10, 25]);
    expect(m[1][1].installment).toBeCloseTo(installment(100_000, 0.04, 25), 6);
    expect(m[0][0].totalInterest).toBeCloseTo(installment(100_000, 0.03, 10) * 120 - 100_000, 4);
  });

  it("higher rate or longer duration: installment goes up (rate) / down (years)", () => {
    const m = rateMatrix(150_000, [0.02, 0.05], [10, 30]);
    expect(m[1][0].installment).toBeGreaterThan(m[0][0].installment);
    expect(m[0][1].installment).toBeLessThan(m[0][0].installment);
  });

  it("zero loan gives zero installments and no interest", () => {
    const m = rateMatrix(0, [0.03], [20]);
    expect(m[0][0]).toMatchObject({ installment: 0, totalInterest: 0 });
  });
});
