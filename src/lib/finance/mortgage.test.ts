import { describe, expect, it } from "vitest";
import { installment, monthlyFactor } from "./mortgage";

describe("monthlyFactor / installment", () => {
  it("matches a standard French amortization value", () => {
    // 100.000 € at 3,5% for 25 years ≈ 500,62 €/month (external calculator)
    expect(installment(100_000, 0.035, 25)).toBeCloseTo(500.62, 1);
    // 200.000 € at 3% for 30 years ≈ 843,21 €/month
    expect(installment(200_000, 0.03, 30)).toBeCloseTo(843.21, 1);
  });

  it("rate 0 gives k = 1/n", () => {
    expect(monthlyFactor(0, 20)).toBeCloseTo(1 / 240, 12);
    expect(installment(120_000, 0, 10)).toBeCloseTo(1_000, 9);
  });

  it("non-positive loan gives 0", () => {
    expect(installment(0, 0.035, 25)).toBe(0);
    expect(installment(-5, 0.035, 25)).toBe(0);
  });

  it("k decreases with duration", () => {
    expect(monthlyFactor(0.035, 30)).toBeLessThan(monthlyFactor(0.035, 10));
  });
});
