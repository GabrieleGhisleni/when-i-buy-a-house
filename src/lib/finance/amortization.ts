import { finite, installment, monthCount } from "./mortgage";

/** One year of the amortization schedule (sums of the monthly French schedule). */
export interface YearRow {
  /** 1-based year index */
  year: number;
  /** Principal repaid during the year */
  principal: number;
  /** Interest paid during the year */
  interest: number;
  /** Remaining debt at year end */
  remaining: number;
}

/** Yearly aggregation of the monthly French amortization schedule. Empty when loan ≤ 0. */
export function amortizationSchedule(loan: number, annualRate: number, years: number): YearRow[] {
  if (!(loan > 0) || !Number.isFinite(loan)) return [];
  const n = monthCount(years);
  const i = finite(annualRate) / 12;
  const monthly = installment(loan, annualRate, years);
  const rows: YearRow[] = [];
  let balance = loan;
  let row: YearRow = { year: 1, principal: 0, interest: 0, remaining: loan };
  for (let m = 1; m <= n; m++) {
    const interest = balance * i;
    const principal = m === n ? balance : monthly - interest;
    balance -= principal;
    row.interest += interest;
    row.principal += principal;
    if (m % 12 === 0 || m === n) {
      row.remaining = Math.abs(balance) < 1e-6 ? 0 : balance;
      rows.push(row);
      row = { year: row.year + 1, principal: 0, interest: 0, remaining: balance };
    }
  }
  return rows;
}
