import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { InfoPopover } from "@/components/info-popover";
import { downPaymentSweep } from "@/lib/finance";
import { formatEur } from "@/lib/format";
import type { ViewProps } from "./types";

const config = {
  installment: {
    label: "Rata mensile",
    color: "var(--chart-1)",
  },
  totalInterest: {
    label: "Interessi totali",
    color: "var(--chart-2)",
  },
  residualLiquidity: {
    label: "Liquidità residua",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

function compact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${Math.round(n / 100_000) / 10} M €`.replace(".", ",");
  if (abs >= 1000) return `${Math.round(n / 1000)}k €`;
  return `${Math.round(n)} €`;
}

export function DownPaymentChart({ inputs, scenario }: ViewProps) {
  const info = (
    <InfoPopover title="Anticipo ↔ rata">
      <p>
        Mostra come cambiano rata, interessi totali e liquidità residua al variare dell'anticipo,
        dal minimo richiesto dalla banca al massimo che il capitale consente.
      </p>
      <p>
        Per ogni anticipo si ricalcola il mutuo (prezzo − anticipo) con tasso e durata attuali. La
        rata usa l'asse sinistro; interessi e liquidità l'asse destro.
      </p>
      <p>
        Più anticipo = rata e interessi più bassi, ma meno liquidità. La linea verticale è
        l'anticipo attuale.
      </p>
    </InfoPopover>
  );

  const data = scenario.capitalSufficient ? downPaymentSweep(inputs) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          Anticipo ↔ rata
          {info}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!scenario.capitalSufficient || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Il capitale non basta per l'anticipo minimo più costi, arredo e fondo emergenza: non c'è
            nessun anticipo possibile da confrontare.
          </p>
        ) : (
          <ChartContainer config={config} className="aspect-auto h-72 w-full">
            <LineChart data={data} margin={{ left: 0, right: 0, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="downPayment"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={compact}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
              />
              <YAxis
                yAxisId="left"
                tickFormatter={compact}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={compact}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, p) =>
                      `Anticipo ${formatEur(Number(p?.[0]?.payload?.downPayment ?? 0))}`
                    }
                    formatter={(value, name) => (
                      <div className="flex w-full justify-between gap-4">
                        <span className="text-muted-foreground">
                          {config[name as keyof typeof config]?.label ?? name}
                        </span>
                        <span className="font-mono font-medium tabular-nums">
                          {formatEur(Number(value))}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <ReferenceLine
                yAxisId="left"
                x={scenario.downPayment}
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
              />
              <Line
                yAxisId="left"
                dataKey="installment"
                stroke="var(--color-installment)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                dataKey="totalInterest"
                stroke="var(--color-totalInterest)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                dataKey="residualLiquidity"
                stroke="var(--color-residualLiquidity)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
