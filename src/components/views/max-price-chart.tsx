import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";
import { InfoPopover } from "@/components/info-popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { maxAffordablePrice, maxPriceCurve } from "@/lib/finance";
import type { Binding, MaxPricePoint } from "@/lib/finance";
import { formatEur, formatNumberIt, formatPct } from "@/lib/format";
import type { ViewProps } from "./types";

const chartConfig = {
  maxPrice: {
    label: "Prezzo massimo",
    color: "var(--chart-1)",
  },
  comfortablePrice: {
    label: "Prezzo massimo comodo",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const BINDING_LABEL: Record<Binding, string> = { capital: "capitale", income: "reddito" };

/** Compact euro for axis ticks, e.g. 250000 -> "250k €". */
function compactEur(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${formatNumberIt(n / 1_000_000, 1)} M €`;
  if (Math.abs(n) >= 1_000) return `${formatNumberIt(Math.round(n / 1_000))}k €`;
  return formatEur(n);
}

interface DotProps {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: MaxPricePoint;
}

/** Dot shape encodes the binding constraint: square = capital, circle = income. */
function BindingDot({ cx, cy, index, payload }: DotProps) {
  if (cx === undefined || cy === undefined || !payload) return <g key={index} />;
  if (payload.binding === "capital") {
    return (
      <rect
        key={index}
        x={cx - 3}
        y={cy - 3}
        width={6}
        height={6}
        fill="var(--color-maxPrice)"
        stroke="var(--background)"
        strokeWidth={1}
      />
    );
  }
  return (
    <circle
      key={index}
      cx={cx}
      cy={cy}
      r={3}
      fill="var(--background)"
      stroke="var(--color-maxPrice)"
      strokeWidth={1.5}
    />
  );
}

interface TooltipPayloadItem {
  payload?: MaxPricePoint;
}

function CurveTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="grid min-w-40 gap-1 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <p className="font-medium">{point.years} anni</p>
      <p className="flex justify-between gap-3">
        <span className="text-muted-foreground">Prezzo massimo</span>
        <span className="font-mono tabular-nums">{formatEur(point.maxPrice)}</span>
      </p>
      <p className="flex justify-between gap-3">
        <span className="text-muted-foreground">Comodo</span>
        <span className="font-mono tabular-nums">{formatEur(point.comfortablePrice)}</span>
      </p>
      {point.binding && (
        <p className="text-muted-foreground">
          Limitato da: <span className="text-foreground">{BINDING_LABEL[point.binding]}</span>
        </p>
      )}
    </div>
  );
}

export function MaxPriceChart({ inputs }: ViewProps) {
  const curve = useMemo(() => maxPriceCurve(inputs), [inputs]);
  const current = useMemo(() => maxAffordablePrice(inputs, inputs.years), [inputs]);
  const { capitalLimit } = current;
  const incomeMissing = current.incomeLimit === null;
  const noCapital = capitalLimit <= 0;
  // No income and no capital limit (LTV 100%, costs 0): the price is unbounded (Infinity).
  const noLimit = !Number.isFinite(current.price);

  // First duration from which every longer duration is capital-bound (curve flat at the capital limit).
  const flatFrom = useMemo(() => {
    if (incomeMissing) return null;
    let from: number | null = null;
    for (let i = curve.length - 1; i >= 0; i--) {
      if (curve[i].binding !== "capital") break;
      from = curve[i].years;
    }
    return from;
  }, [curve, incomeMissing]);

  const currentPoint = curve.find((p) => p.years === inputs.years);
  // Domain follows the curve (and the chosen price); a far-away capital limit must not squash it.
  const curveMax = Math.max(0, ...curve.map((p) => p.maxPrice).filter(Number.isFinite));
  const yMax = Math.max(curveMax * 1.15, inputs.price * 1.08, 1);
  const capitalInDomain = Number.isFinite(capitalLimit) && capitalLimit <= yMax;
  const capitalOutside = Number.isFinite(capitalLimit) && capitalLimit > yMax;
  const showPrice = inputs.price > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1">
          Prezzo massimo per durata
          <InfoPopover title="Prezzo massimo per durata">
            <p>
              Per ogni durata del mutuo (5–40 anni) mostra il <strong>prezzo più alto</strong> della
              casa che puoi permetterti senza verifiche rosse, con l'anticipo al massimo.
            </p>
            <ul>
              <li>
                <strong>Limite di capitale</strong>: il capitale disponibile (tolti arredo, lavori e
                fondo emergenza) deve coprire anticipo minimo e costi di acquisto. Non dipende dalla
                durata: è la retta orizzontale.
              </li>
              <li>
                <strong>Limite di reddito</strong>: la rata non deve superare la soglia rata/reddito
                ({formatPct(inputs.maxInstallmentToIncome, 0)}). Cresce con la durata, perché la
                rata si abbassa.
              </li>
            </ul>
            <p>
              Il prezzo massimo è il minore dei due. I quadrati indicano i punti limitati dal
              capitale, i cerchi quelli limitati dal reddito.
            </p>
            <p>
              La linea tratteggiata è il prezzo massimo <strong>comodo</strong>: lo stesso calcolo
              con soglia − 5 punti percentuali, cioè la zona verde. Tra le due linee la rata è
              gialla (al limite).
            </p>
          </InfoPopover>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {noCapital ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Capitale insufficiente per qualsiasi prezzo: il capitale non copre arredo, lavori e
            fondo emergenza.
          </p>
        ) : noLimit ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nessun limite calcolabile: senza reddito indicato e con LTV al 100% e costi di acquisto
            a 0, né il capitale né il reddito limitano il prezzo. Inserisci il reddito per vedere il
            prezzo massimo.
          </p>
        ) : (
          <>
            <p className="text-sm">
              Con <strong>{inputs.years} anni</strong> puoi arrivare a{" "}
              <strong>{formatEur(current.price)}</strong>
              {currentPoint && !incomeMissing && Number.isFinite(currentPoint.comfortablePrice) && (
                <> (comodo: {formatEur(currentPoint.comfortablePrice)})</>
              )}
              {current.binding && <>, limitato dal {BINDING_LABEL[current.binding]}</>}.
              {showPrice && (
                <span className="text-muted-foreground">
                  {" "}
                  Il prezzo scelto ({formatEur(inputs.price)}) è{" "}
                  {inputs.price <= current.price ? "entro" : "oltre"} il massimo.
                </span>
              )}
            </p>
            <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full sm:h-80">
              <LineChart data={curve} margin={{ top: 16, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="years"
                  type="number"
                  domain={[5, 40]}
                  ticks={[5, 10, 15, 20, 25, 30, 35, 40]}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={6}
                  tickFormatter={(v: number) => `${v}a`}
                />
                <YAxis
                  domain={[0, yMax]}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(v: number) => compactEur(v)}
                />
                <ChartTooltip cursor={{ strokeDasharray: "3 3" }} content={<CurveTooltip />} />
                {capitalInDomain && (
                  <ReferenceLine
                    y={capitalLimit}
                    stroke="var(--muted-foreground)"
                    strokeDasharray="2 4"
                    label={{
                      value: "Limite di capitale",
                      position: "insideTopRight",
                      fill: "var(--muted-foreground)",
                      fontSize: 11,
                    }}
                  />
                )}
                {showPrice && (
                  <ReferenceLine
                    y={inputs.price}
                    stroke="var(--chart-3)"
                    strokeOpacity={0.7}
                    label={{
                      value: "Prezzo scelto",
                      position: "insideBottomLeft",
                      fill: "var(--muted-foreground)",
                      fontSize: 11,
                    }}
                  />
                )}
                <ReferenceLine
                  x={inputs.years}
                  stroke="var(--muted-foreground)"
                  strokeOpacity={0.6}
                  label={{
                    value: `${inputs.years} anni`,
                    position: "top",
                    fill: "var(--muted-foreground)",
                    fontSize: 11,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="comfortablePrice"
                  stroke="var(--color-comfortablePrice)"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="maxPrice"
                  stroke="var(--color-maxPrice)"
                  strokeWidth={2}
                  dot={(props: DotProps) => <BindingDot key={props.index} {...props} />}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ChartContainer>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-(--chart-1)" aria-hidden />
                Prezzo massimo
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-4 border-t-2 border-dashed border-(--chart-2)" aria-hidden />
                Comodo (soglia − 5 pp)
              </li>
              <li className="flex items-center gap-1.5">
                <span className="size-2 bg-(--chart-1)" aria-hidden />
                limitato dal capitale
              </li>
              <li className="flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full border-[1.5px] border-(--chart-1)"
                  aria-hidden
                />
                limitato dal reddito
              </li>
            </ul>
            {capitalOutside && (
              <p className="text-xs text-muted-foreground">
                Il limite di capitale ({formatEur(capitalLimit)}) è molto sopra il grafico: non
                limita nessuna durata.
              </p>
            )}
            {incomeMissing ? (
              <p className="text-xs text-muted-foreground">
                Reddito non inserito: vale solo il limite di capitale, quindi il prezzo massimo non
                dipende dalla durata.
              </p>
            ) : (
              flatFrom !== null && (
                <p className="text-xs text-muted-foreground">
                  {flatFrom <= curve[0].years
                    ? "Con qualsiasi durata il limite è il capitale: allungare il mutuo non permette una casa più cara."
                    : `Oltre ${flatFrom} anni allungare il mutuo non permette una casa più cara: limita il capitale.`}
                </p>
              )
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
