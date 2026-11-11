import { useMemo, useState, type ReactNode } from "react";
import { SliderField } from "@/components/number-field";
import { InfoPopover } from "@/components/info-popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { installment, installmentLight } from "@/lib/finance";
import type { Light } from "@/lib/finance";
import { formatEur, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";

const MIN_YEARS = 10;
const YEARS_STEP = 5;
/** Soglia rata/reddito di riferimento (Italia, 30%): le celle si colorano rispetto a questa. */
const MAX_INSTALLMENT_TO_INCOME = 0.3;

const LIGHT_CLASSES: Record<Light, string> = {
  green: "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100",
  yellow: "bg-amber-400/25 text-amber-950 dark:text-amber-100",
  red: "bg-red-500/15 text-red-900 dark:text-red-100",
  na: "bg-muted/50",
};

const LIGHT_LABELS: Record<Light, string> = {
  green: "sostenibile",
  yellow: "al limite",
  red: "non sostenibile",
  na: "salario non indicato",
};

/** Titolo visibile sopra uno slider, collegato al suo campo numerico. */
function ParamField({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

/**
 * Seconda pagina: un'unica matrice mutuo × durata con il tasso come input principale.
 * Righe = fasce di importo del mutuo (multipli della fascia), colonne = durate da 10 anni
 * fino al massimo scelto, celle = rata mensile al tasso scelto, colorate in base al
 * rapporto rata / salario medio di entrata.
 */
export function RatePage() {
  const [rate, setRate] = useState(0.035);
  const [band, setBand] = useState(25_000);
  const [bandCount, setBandCount] = useState(20);
  const [maxYears, setMaxYears] = useState(30);
  const [salary, setSalary] = useState(5_000);

  const loans = useMemo(
    () => Array.from({ length: bandCount }, (_, k) => (k + 1) * band),
    [band, bandCount],
  );
  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = MIN_YEARS; y <= maxYears; y += YEARS_STEP) list.push(y);
    return list;
  }, [maxYears]);

  function lightFor(monthly: number): Light {
    if (!(salary > 0)) return "na";
    return installmentLight(monthly / salary, MAX_INSTALLMENT_TO_INCOME);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1">
            Rata per tasso, importo e durata
            <InfoPopover title="Seconda pagina">
              <p>
                Scegli il <strong>tasso fisso</strong> e la matrice ti dice la rata mensile per ogni
                importo di mutuo (righe) e ogni durata (colonne).
              </p>
              <p>
                La <strong>fascia</strong> è il passo tra un importo e il successivo: con 5.000 € e
                20 fasce le righe vanno da 5.000 € a 100.000 €. Gli anni massimi decidono le colonne
                (10, 15, 20… fino al massimo).
              </p>
              <p>
                Il <strong>salario medio di entrata</strong> (netto mensile) serve per colorare le
                celle: verde se la rata resta sotto il 30% del salario, giallo se è vicina al
                limite, rosso se lo supera.
              </p>
            </InfoPopover>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <ParamField id="rate-page-rate" label="Tasso di interesse">
            <SliderField
              id="rate-page-rate"
              aria-label="Tasso di interesse"
              value={rate}
              percent
              min={0.001}
              max={0.2}
              sliderMin={0.001}
              sliderMax={0.15}
              step={0.001}
              decimals={2}
              suffix="%"
              onChange={(v) => setRate(v ?? rate)}
            />
          </ParamField>
          <ParamField id="rate-page-salary" label="Salario medio di entrata (netto mensile)">
            <SliderField
              id="rate-page-salary"
              aria-label="Salario medio di entrata"
              value={salary}
              min={0}
              max={1e9}
              sliderMin={500}
              sliderMax={10_000}
              step={100}
              suffix="€"
              onChange={(v) => setSalary(v ?? 0)}
            />
          </ParamField>
          <ParamField id="rate-page-band" label="Ampiezza fascia mutuo">
            <SliderField
              id="rate-page-band"
              aria-label="Ampiezza fascia mutuo"
              value={band}
              min={1000}
              max={1e9}
              sliderMin={5000}
              sliderMax={100_000}
              step={5000}
              suffix="€"
              onChange={(v) => setBand(v ?? band)}
            />
          </ParamField>
          <ParamField id="rate-page-count" label="Numero di fasce">
            <SliderField
              id="rate-page-count"
              aria-label="Numero di fasce"
              value={bandCount}
              min={1}
              max={50}
              sliderMin={1}
              sliderMax={20}
              step={1}
              onChange={(v) => setBandCount(v ?? bandCount)}
            />
          </ParamField>
          <ParamField id="rate-page-years" label="Anni massimi">
            <SliderField
              id="rate-page-years"
              aria-label="Anni massimi"
              value={maxYears}
              min={MIN_YEARS}
              max={40}
              sliderMin={MIN_YEARS}
              sliderMax={40}
              step={YEARS_STEP}
              suffix="anni"
              onChange={(v) => setMaxYears(v ?? maxYears)}
            />
          </ParamField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rata mensile al {formatPct(rate, 2)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full border-separate border-spacing-0.5 text-[11px] tabular-nums sm:border-spacing-1 sm:text-sm">
              <caption className="sr-only">
                Rata mensile per importo del mutuo e durata, al tasso scelto
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="px-1 py-1 text-left font-medium text-muted-foreground">
                    Mutuo
                  </th>
                  {years.map((y) => (
                    <th
                      key={y}
                      scope="col"
                      className="px-1 py-1 text-center font-medium whitespace-nowrap text-muted-foreground"
                    >
                      {y} <span className="hidden sm:inline">anni</span>
                      <span className="sm:hidden">a</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => (
                  <tr key={loan}>
                    <th
                      scope="row"
                      className="px-1 py-1 text-left font-normal whitespace-nowrap text-muted-foreground"
                    >
                      {formatEur(loan)}
                    </th>
                    {years.map((y) => {
                      const monthly = installment(loan, rate, y);
                      const light = lightFor(monthly);
                      const totalRepaid = monthly * y * 12;
                      const totalInterest = totalRepaid - loan;
                      return (
                        <td key={y} className="p-0">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                tabIndex={0}
                                aria-label={`${formatEur(loan)} in ${y} anni: rata ${formatEur(monthly)}, ${LIGHT_LABELS[light]}`}
                                className={cn(
                                  "rounded-md px-1 py-1.5 text-center whitespace-nowrap focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-2 sm:py-2",
                                  LIGHT_CLASSES[light],
                                )}
                              >
                                {formatEur(monthly)}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="w-72 p-3 text-sm">
                              <div className="space-y-2">
                                <p className="border-b border-background/20 pb-2 text-base font-semibold">
                                  Mutuo {formatEur(loan)} · {y} anni a {formatPct(rate, 2)}
                                </p>
                                <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 tabular-nums">
                                  <dt className="text-left">Rata mensile</dt>
                                  <dd className="text-right font-semibold">{formatEur(monthly)}</dd>
                                  <dt className="text-left">Interessi pagati alla banca</dt>
                                  <dd className="text-right font-semibold">
                                    {formatEur(totalInterest)}
                                  </dd>
                                  <dt className="text-left">Totale restituito</dt>
                                  <dd className="text-right">{formatEur(totalRepaid)}</dd>
                                  <dt className="text-left">Rata / salario</dt>
                                  <dd className="text-right">
                                    {salary > 0 ? formatPct(monthly / salary, 1) : "n/d"}
                                  </dd>
                                </dl>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <ul aria-label="Legenda colori" className="flex flex-wrap gap-x-4 gap-y-1">
              {(["green", "yellow", "red"] as const).map((l) => (
                <li key={l} className="flex items-center gap-1.5">
                  <span className={cn("size-3 rounded-sm", LIGHT_CLASSES[l])} aria-hidden />
                  {LIGHT_LABELS[l]}
                </li>
              ))}
            </ul>
            <InfoPopover title="Cosa significano i colori">
              <p>
                Ogni cella confronta la <strong>rata mensile</strong> con il{" "}
                <strong>salario medio di entrata</strong>, cioè il rapporto rata/salario.
              </p>
              <p>
                <strong>Sostenibile</strong> (verde): la rata resta sotto il 25% del salario.
              </p>
              <p>
                <strong>Al limite</strong> (giallo): la rata è vicina alla soglia del 30%.
              </p>
              <p>
                <strong>Non sostenibile</strong> (rosso): la rata supera il 30% del salario.
              </p>
              <p>
                La soglia del 30% è quella bancaria italiana di riferimento; il giallo copre
                l'intervallo di 5 punti sotto la soglia.
              </p>
            </InfoPopover>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
