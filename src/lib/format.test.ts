import { describe, expect, it } from "vitest";
import { formatEur, formatNumberIt, formatPct, parseItNumber } from "./format";

describe("formatting", () => {
  it("formats numbers with it-IT separators, also for 4 digits", () => {
    expect(formatNumberIt(1500)).toBe("1.500");
    expect(formatNumberIt(200000.5, 2)).toBe("200.000,50");
  });
  it("formats euros", () => {
    expect(formatEur(200000).replace(" ", " ")).toBe("200.000 €");
    expect(formatEur(959.456, { decimals: 2 }).replace(" ", " ")).toBe("959,46 €");
  });
  it("formats percentages", () => {
    expect(formatPct(0.035)).toBe("3,5%");
    expect(formatPct(0.3, 0)).toBe("30%");
  });
});

describe("parseItNumber", () => {
  it.each([
    ["3,5", 3.5],
    ["200.000", 200000],
    ["200.000,50", 200000.5],
    ["1.5", 1.5],
    ["3.25", 3.25],
    ["1.500", 1500],
    ["1.234.567", 1234567],
    ["  200 000 € ", 200000],
    ["3,5 %", 3.5],
    ["€ 1.000", 1000],
    ["42", 42],
    ["-5", -5],
    [",5", 0.5],
    ["0", 0],
    ["0.035", 0.035],
    ["0.500", 0.5],
    [".125", 0.125],
    ["0,035", 0.035],
  ])("parses %j", (text, expected) => {
    expect(parseItNumber(text)).toBeCloseTo(expected, 10);
  });
  it.each([
    ["3.500", 3.5],
    ["3.5", 3.5],
    ["0.125", 0.125],
    ["3,5", 3.5],
    ["35", 35],
  ])("parses percent %j", (text, expected) => {
    expect(parseItNumber(text, { percent: true })).toBeCloseTo(expected, 10);
  });
  it.each(["", "  ", "abc", "1,2,3", "12.34.5", "1..5", "--3", "3,5x"])("rejects %j", (text) => {
    expect(parseItNumber(text)).toBeNull();
  });
});
