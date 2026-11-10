import { useMemo, useState } from "react";
import { InfoPopover } from "@/components/info-popover";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { matrixPrices, priceMatrix } from "@/lib/finance";
import type { Light, MatrixCell } from "@/lib/finance";
import { formatEur, formatNumberIt, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ViewProps } from "./types";

const DURATIONS = [10, 15, 20, 25, 30];
const SPREADS = [0.25, 0.5, 0.75];

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

/** Compact euro for narrow screens, e.g. 250000 -> "250k €". */
function compactEur(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${formatNumberIt(n / 1_000_000, 2)} M €`;
  if (Math.abs(n) >= 1_000) return `${formatNumberIt(n / 1_000, n % 1_000 === 0 ? 0 : 1)}k €`;
  return formatEur(n);
}

function cellLabel(cell: MatrixCell): string {
  const ratio = cell.installmentToIncome === null ? "n/d" : formatPct(cell.installmentToIncome, 1);
  return `Prezzo ${formatEur(cell.price)}, ${cell.years} anni: rata ${formatEur(cell.installment)}, rata/reddito ${ratio}, ${LIGHT_LABELS[cell.overall]}. Carica nello scenario.`;
}

export function PriceDurationMatrix({ inputs, update }: ViewProps) {
  const [spread, setSpread] = useState(0.5);
  const prices = useMemo(() => matrixPrices(inputs.price, spread), [inputs.price, spread]);
  const matrix = useMemo(() => priceMatrix(inputs, prices, DURATIONS), [inputs, prices]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1">
          Matrice prezzo × durata
          <InfoPopover title="Matrice prezzo × durata">
            <p>
              Ogni cella mostra la <strong>rata mensile</strong> per un prezzo (righe) e una durata
              (colonne), sempre con l'<strong>anticipo al massimo</strong> possibile.
            </p>
            <p>
              Il colore indica la fattibilità: verde sostenibile, giallo al limite (rata/reddito
              vicino alla soglia), rosso non fattibile (capitale insufficiente o rata oltre la
              soglia).
            </p>
            <p>
              Passa sopra una cella per interessi totali, rata/reddito e mutuo; clicca o tocca per
              caricare prezzo e durata nello scenario.
            </p>
            <p>
              Tutte le durate usano lo <strong>stesso tasso</strong>. Nella realtà il tasso fisso
              segue l'IRS di pari durata, quindi le durate lunghe di solito costano un po' di più.
            </p>
          </InfoPopover>
        </CardTitle>
        <CardAction>
          <div role="group" aria-label="Ampiezza intervallo prezzi" className="flex gap-1">
            {SPREADS.map((s) => (
              <Button
                key={s}
                type="button"
                size="xs"
                variant={s === spread ? "default" : "outline"}
                aria-pressed={s === spread}
                onClick={() => setSpread(s)}
              >
                ±{Math.round(s * 100)}%
              </Button>
            ))}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        {prices.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Inserisci un prezzo della casa per vedere la matrice.
          </p>
        ) : (
          <>
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="w-full border-separate border-spacing-0.5 text-[11px] tabular-nums sm:border-spacing-1 sm:text-sm">
                <caption className="sr-only">
                  Rata mensile per prezzo della casa e durata del mutuo
                </caption>
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="px-1 py-1 text-left font-medium text-muted-foreground"
                    >
                      Prezzo
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
                  {matrix.map((row, i) => {
                    const price = prices[i];
                    const isCurrentRow = price === inputs.price;
                    return (
                      <tr key={price}>
                        <th
                          scope="row"
                          className={cn(
                            "px-1 py-1 text-left font-normal whitespace-nowrap text-muted-foreground",
                            isCurrentRow && "font-semibold text-foreground",
                          )}
                        >
                          <span className="sm:hidden">{compactEur(price)}</span>
                          <span className="hidden sm:inline">{formatEur(price)}</span>
                        </th>
                        {row.map((cell) => {
                          const isCurrent = isCurrentRow && cell.years === inputs.years;
                          return (
                            <td key={cell.years} className="p-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    aria-label={cellLabel(cell)}
                                    aria-current={isCurrent ? "true" : undefined}
                                    onClick={() =>
                                      update({
                                        price: cell.price,
                                        years: cell.years,
                                        downPayment: { mode: "max" },
                                      })
                                    }
                                    className={cn(
                                      "w-full rounded-md px-1 py-1.5 text-center whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-2 sm:py-2",
                                      LIGHT_CLASSES[cell.overall],
                                      isCurrent &&
                                        "font-semibold ring-2 ring-foreground ring-offset-1 ring-offset-background",
                                    )}
                                  >
                                    {formatEur(cell.installment)}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="hidden sm:inline-flex">
                                  <div className="space-y-0.5">
                                    <p className="font-medium">
                                      {formatEur(cell.price)} · {cell.years} anni
                                    </p>
                                    <p>Rata: {formatEur(cell.installment)}</p>
                                    <p>Interessi totali: {formatEur(cell.totalInterest)}</p>
                                    <p>
                                      Rata/reddito:{" "}
                                      {cell.installmentToIncome === null
                                        ? "n/d (reddito mancante)"
                                        : formatPct(cell.installmentToIncome, 1)}
                                    </p>
                                    <p>Mutuo: {formatEur(cell.loan)}</p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul
              aria-label="Legenda colori"
              className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"
            >
              {(["green", "yellow", "red"] as const).map((l) => (
                <li key={l} className="flex items-center gap-1.5">
                  <span className={cn("size-3 rounded-sm", LIGHT_CLASSES[l])} aria-hidden />
                  {LIGHT_LABELS[l]}
                </li>
              ))}
              <li className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm ring-2 ring-foreground" aria-hidden />
                scenario attuale
              </li>
            </ul>
            <p className="text-xs text-muted-foreground">
              Tocca una cella per caricarla nello scenario.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
