import { describe, expect, it } from "vitest";
import { amortizationSchedule } from "./amortization";
import { installment } from "./mortgage";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("amortizationSchedule", () => {
  for (const [loan, rate, years] of [
    [97_000, 0.035, 25],
    [309_000, 0.035, 30],
    [150_000, 0, 20],
  ] as const) {
    it(`${loan} € at ${rate} for ${years}y`, () => {
      const rows = amortizationSchedule(loan, rate, years);
      expect(rows).toHaveLength(years);
      expect(rows.map((r) => r.year)).toEqual(Array.from({ length: years }, (_, i) => i + 1));
      expect(sum(rows.map((r) => r.principal))).toBeCloseTo(loan, 4);
      expect(rows.at(-1)?.remaining).toBeCloseTo(0, 4);
      const totalInterest = installment(loan, rate, years) * years * 12 - loan;
      expect(sum(rows.map((r) => r.interest))).toBeCloseTo(totalInterest, 4);
      // remaining decreases year over year
      for (let i = 1; i < rows.length; i++) {
        expect(rows[i].remaining).toBeLessThan(rows[i - 1].remaining);
      }
      // each year pays 12 installments
      const m = installment(loan, rate, years);
      expect(rows[0].principal + rows[0].interest).toBeCloseTo(12 * m, 6);
    });
  }

  it("is empty when no loan", () => {
    expect(amortizationSchedule(0, 0.035, 25)).toEqual([]);
  });
});
