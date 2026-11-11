import { useMemo } from "react";
import { InfoPopover } from "@/components/info-popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { installmentLight, rateMatrix, rateMatrixRates } from "@/lib/finance";
import type { Light } from "@/lib/finance";
import { formatEur, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ViewProps } from "./types";

const DURATIONS = [10, 15, 20, 25, 30];

const LIGHT_CLASSES: Record<Light, string> = {
  green: "bg-emerald-500/15 text-emerald-900 hover:bg-emerald-500/25 dark:text-emerald-100",
  yellow: "bg-amber-400/25 text-amber-950 hover:bg-amber-400/35 dark:text-amber-100",
  red: "bg-red-500/15 text-red-900 hover:bg-red-500/25 dark:text-red-100",
  na: "bg-muted text-muted-foreground hover:bg-muted/70",
};

const LIGHT_LABELS: Record<Light, string> = {
  green: "sostenibile",
  yellow: "al limite",
  red: "non fattibile",
  na: "non valutabile",
};

/**
 * Rata mensile per tasso (righe) e durata (colonne) sul mutuo attuale: il prezzo non cambia,
 * quindi la matrice non dipende dalla casa ma solo dal capitale finanziato.
 */
export function RateDurationMatrix({ inputs, scenario, update }: ViewProps) {
  const loan = scenario.loan;
  const rates = useMemo(() => rateMatrixRates(inputs.annualRate), [inputs.annualRate]);
  const matrix = useMemo(() => rateMatrix(loan, rates, DURATIONS), [loan, rates]);
  const income =
    typeof inputs.monthlyIncome === "number" && inputs.monthlyIncome > 0
      ? inputs.monthlyIncome
      : null;
  const hasLoan = loan > 0;

  function lightFor(value: number): Light {
    if (!hasLoan || income === null) return "na";
    return installmentLight(value / income, inputs.maxInstallmentToIncome);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1">
          Matrice tasso × durata
          <InfoPopover title="Matrice tasso × durata">
            <p>
              Ogni cella mostra la <strong>rata mensile</strong> per un tasso fisso (righe) e una
              durata (colonne). Il mutuo è quello dello scenario attuale: prezzo e anticipo non
              cambiano.
            </p>
            <p>
              Il colore segue la soglia rata/reddito: verde sostenibile, giallo al limite, rosso
              oltre la soglia. Senza reddito o senza mutuo le celle restano neutre.
            </p>
            <p>Clicca o tocca una cella per caricare tasso e durata nello scenario.</p>
          </InfoPopover>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasLoan ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nessun mutuo da calcolare con l'anticipo attuale: la matrice tasso × durata è vuota.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Mutuo: <span className="font-medium text-foreground">{formatEur(loan)}</span>
            </p>
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="w-full border-separate border-spacing-0.5 text-[11px] tabular-nums sm:border-spacing-1 sm:text-sm">
                <caption className="sr-only">
                  Rata mensile per tasso di interesse e durata del mutuo
                </caption>
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="px-1 py-1 text-left font-medium text-muted-foreground"
                    >
                      Tasso
                    </th>
                    {DURATIONS.map((y) => (
                      <th
                        key={y}
                        scope="col"
                        className={cn(
                          "px-1 py-1 text-center font-medium whitespace-nowrap text-muted-foreground",
                          y === inputs.years && "text-foreground",
                        )}
                      >
                        {y} <span className="hidden sm:inline">anni</span>
                        <span className="sm:hidden">a</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row) => {
                    const rate = row[0].annualRate;
                    const isCurrentRow = Math.abs(rate - inputs.annualRate) < 1e-9;
                    return (
                      <tr key={rate}>
                        <th
                          scope="row"
                          className={cn(
                            "px-1 py-1 text-left font-normal whitespace-nowrap text-muted-foreground",
                            isCurrentRow && "font-semibold text-foreground",
                          )}
                        >
                          {formatPct(rate, 2)}
                        </th>
                        {row.map((cell) => {
                          const light = lightFor(cell.installment);
                          const isCurrent = isCurrentRow && cell.years === inputs.years;
                          const label = `Tasso ${formatPct(cell.annualRate, 2)}, ${cell.years} anni: rata ${formatEur(cell.installment)}, interessi totali ${formatEur(cell.totalInterest)}, ${LIGHT_LABELS[light]}. Carica nello scenario.`;
                          return (
                            <td key={cell.years} className="p-0">
                              <button
                                type="button"
                                aria-label={label}
                                aria-current={isCurrent ? "true" : undefined}
                                onClick={() =>
                                  update({ annualRate: cell.annualRate, years: cell.years })
                                }
                                className={cn(
                                  "w-full rounded-md px-1 py-1.5 text-center whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-2 sm:py-2",
                                  LIGHT_CLASSES[light],
                                  isCurrent &&
                                    "font-semibold ring-2 ring-foreground ring-offset-1 ring-offset-background",
                                )}
                              >
                                {formatEur(cell.installment)}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Tocca una cella per caricarla nello scenario.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
