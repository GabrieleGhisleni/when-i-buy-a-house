import { describe, expect, it } from "vitest";
import { computeScenario } from "./scenario";
import { controlInputs } from "./test-helpers";

describe("computeScenario: control values (docs/PLAN.md)", () => {
  const cases = [
    { price: 200_000, years: 10, loan: 97_000, rata: 959, interest: 18_100 },
    { price: 200_000, years: 30, loan: 97_000, rata: 436, interest: 59_800 },
    { price: 400_000, years: 10, loan: 309_000, rata: 3_056, interest: 57_700 },
    { price: 400_000, years: 30, loan: 309_000, rata: 1_388, interest: 190_500 },
  ];
  for (const c of cases) {
    it(`${c.price} € over ${c.years} years`, () => {
      const s = computeScenario(controlInputs({ price: c.price, years: c.years }));
      expect(s.loan).toBeCloseTo(c.loan, 6);
      expect(Math.abs(s.installment - c.rata)).toBeLessThan(1);
      expect(Math.abs(s.totalInterest - c.interest)).toBeLessThan(100);
      expect(s.totalRepaid).toBeCloseTo(s.installment * c.years * 12, 6);
      expect(s.totalHouseCost).toBeCloseTo(c.price + c.price * 0.06 + s.totalInterest, 6);
    });
  }

  it("200k / 25y: max down payment, residual 0, green", () => {
    const s = computeScenario(controlInputs());
    expect(s.purchaseCosts).toBeCloseTo(12_000, 6);
    expect(s.minDownPayment).toBeCloseTo(40_000, 6);
    expect(s.maxDownPayment).toBeCloseTo(103_000, 6);
    expect(s.downPayment).toBeCloseTo(103_000, 6);
    expect(s.residualLiquidity).toBeCloseTo(0, 6);
    expect(s.missingCapital).toBe(0);
    expect(s.effectiveLtv).toBeCloseTo(97_000 / 200_000, 9);
    expect(s.installmentToIncome).toBeCloseTo(s.installment / 3_000, 12);
    expect(s.checks).toEqual({ capital: "green", installment: "green" });
    expect(s.overall).toBe("green");
    expect(s.incomplete).toBe(false);
  });
});

describe("computeScenario: edge cases", () => {
  it("rate 0: no interest, installment = loan / n", () => {
    const s = computeScenario(controlInputs({ annualRate: 0, years: 20 }));
    expect(s.totalInterest).toBeCloseTo(0, 6);
    expect(s.installment).toBeCloseTo(97_000 / 240, 9);
  });

  it("mortgage not needed: house paid in cash", () => {
    const s = computeScenario(controlInputs({ capital: 300_000, price: 200_000 }));
    expect(s.needsMortgage).toBe(false);
    expect(s.loan).toBe(0);
    expect(s.installment).toBe(0);
    expect(s.totalInterest).toBe(0);
    expect(s.downPayment).toBe(200_000);
    expect(s.residualLiquidity).toBeCloseTo(300_000 - 200_000 - 12_000 - 35_000, 6);
    expect(s.checks.installment).toBe("na");
    expect(s.overall).toBe("green");
    expect(s.effectiveLtv).toBe(0);
  });

  it("insufficient capital: scenario at min down payment, missing capital", () => {
    // price 500k: min 100k + costs 30k + 35k = 165k needed, capital 150k → missing 15k
    const s = computeScenario(controlInputs({ price: 500_000 }));
    expect(s.capitalSufficient).toBe(false);
    expect(s.downPayment).toBeCloseTo(100_000, 6);
    expect(s.loan).toBeCloseTo(400_000, 6);
    expect(s.effectiveLtv).toBeCloseTo(0.8, 9);
    expect(s.residualLiquidity).toBeCloseTo(-15_000, 6);
    expect(s.missingCapital).toBeCloseTo(15_000, 6);
    expect(s.checks.capital).toBe("red");
    expect(s.overall).toBe("red");
  });

  it("insufficient capital ignores a custom down payment", () => {
    const s = computeScenario(
      controlInputs({ price: 500_000, downPayment: { mode: "custom", value: 10 } }),
    );
    expect(s.downPayment).toBeCloseTo(100_000, 6);
  });

  it("custom down payment out of range is clamped", () => {
    const low = computeScenario(controlInputs({ downPayment: { mode: "custom", value: 1_000 } }));
    expect(low.downPayment).toBeCloseTo(40_000, 6);
    expect(low.residualLiquidity).toBeCloseTo(63_000, 6);
    const high = computeScenario(
      controlInputs({ downPayment: { mode: "custom", value: 999_999 } }),
    );
    expect(high.downPayment).toBeCloseTo(103_000, 6);
    const mid = computeScenario(controlInputs({ downPayment: { mode: "custom", value: 70_000 } }));
    expect(mid.downPayment).toBe(70_000);
    expect(mid.loan).toBeCloseTo(130_000, 6);
  });

  it("installment/income threshold and yellow band", () => {
    // 200k/25y: loan 97k → M ≈ 485,6 €. Choose incomes to place the ratio.
    const m = computeScenario(controlInputs()).installment;
    const at = (ratio: number) =>
      computeScenario(controlInputs({ monthlyIncome: m / ratio })).checks.installment;
    expect(at(0.2)).toBe("green");
    expect(at(0.25)).toBe("green"); // s − 5 pp boundary is green
    expect(at(0.26)).toBe("yellow");
    expect(at(0.3)).toBe("yellow"); // s boundary is yellow
    expect(at(0.31)).toBe("red");
    const yellow = computeScenario(controlInputs({ monthlyIncome: m / 0.28 }));
    expect(yellow.overall).toBe("yellow");
    const red = computeScenario(controlInputs({ monthlyIncome: m / 0.4 }));
    expect(red.overall).toBe("red");
  });

  it("missing income: n/a check, incomplete, ratio null", () => {
    for (const monthlyIncome of [null, 0, -100]) {
      const s = computeScenario(controlInputs({ monthlyIncome }));
      expect(s.installmentToIncome).toBeNull();
      expect(s.checks.installment).toBe("na");
      expect(s.incomplete).toBe(true);
      expect(s.overall).toBe("green");
    }
    const red = computeScenario(controlInputs({ monthlyIncome: null, price: 500_000 }));
    expect(red.overall).toBe("red");
  });

  it("price 0 and capital 0 produce finite numbers", () => {
    const zeroPrice = computeScenario(controlInputs({ price: 0 }));
    expect(zeroPrice.loan).toBe(0);
    expect(zeroPrice.effectiveLtv).toBe(0);
    expect(zeroPrice.needsMortgage).toBe(false);
    expect(zeroPrice.overall).toBe("green");

    const zeroCapital = computeScenario(controlInputs({ capital: 0 }));
    expect(zeroCapital.capitalSufficient).toBe(false);
    expect(zeroCapital.maxDownPayment).toBe(0);
    expect(zeroCapital.downPayment).toBeCloseTo(40_000, 6);
    expect(zeroCapital.missingCapital).toBeCloseTo(87_000, 6);
    expect(zeroCapital.overall).toBe("red");
    const numbers = Object.values(zeroCapital).filter((v) => typeof v === "number");
    expect(numbers.every((v) => Number.isFinite(v))).toBe(true);
  });

  it("price 0 with capital below extras is red (capital does not cover A + F)", () => {
    const s = computeScenario(controlInputs({ price: 0, capital: 10_000 }));
    expect(s.capitalSufficient).toBe(false);
    expect(s.missingCapital).toBeCloseTo(25_000, 6);
    expect(s.overall).toBe("red");
  });
});
