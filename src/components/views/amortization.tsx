import { useMemo } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { ChevronDown } from "lucide-react";
import { InfoPopover } from "@/components/info-popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { amortizationSchedule } from "@/lib/finance";
import { formatEur, formatNumberIt } from "@/lib/format";
import type { ViewProps } from "./types";

const chartConfig = {
  principal: { label: "Quota capitale", color: "var(--chart-1)" },
  interest: { label: "Quota interessi", color: "var(--chart-2)" },
  remaining: { label: "Debito residuo", color: "var(--foreground)" },
} satisfies ChartConfig;

function compactEur(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${formatNumberIt(v / 1_000_000, 1)}M €`;
  if (abs >= 1000) return `${formatNumberIt(Math.round(v / 1000))}k €`;
  return `${formatNumberIt(v)} €`;
}

export function AmortizationView({ scenario, inputs }: ViewProps) {
  const rows = useMemo(
    () =>
      scenario.needsMortgage
        ? amortizationSchedule(scenario.loan, inputs.annualRate, inputs.years)
        : [],
    [scenario.needsMortgage, scenario.loan, inputs.annualRate, inputs.years],
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          principal: acc.principal + r.principal,
          interest: acc.interest + r.interest,
        }),
        { principal: 0, interest: 0 },
      ),
    [rows],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1">
          Piano di ammortamento
          <InfoPopover title="Piano di ammortamento">
            <p>
              Ammortamento <strong>alla francese</strong>: la rata è costante per tutta la durata,
              ma la sua composizione cambia. All&apos;inizio la maggior parte va in interessi
              (calcolati sul debito ancora da restituire); col tempo il debito scende, gli interessi
              diminuiscono e la quota capitale cresce.
            </p>
            <ul>
              <li>
                <strong>Barre</strong> (asse sinistro): per ogni anno, quota capitale + quota
                interessi = rata annua.
              </li>
              <li>
                <strong>Linea</strong> (asse destro): debito residuo a fine anno, fino a zero.
              </li>
            </ul>
            <p>Tasso fisso costante, dati aggregati per anno dal piano mensile.</p>
          </InfoPopover>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Il mutuo non serve: nessun piano di ammortamento.
          </p>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
              <ComposedChart data={rows} margin={{ left: 0, right: 0, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="year"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={16}
                />
                <YAxis
                  yAxisId="left"
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={compactEur}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={compactEur}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => `Anno ${payload?.[0]?.payload?.year ?? ""}`}
                      formatter={(value, name) => (
                        <div className="flex w-full items-center justify-between gap-4">
                          <span className="text-muted-foreground">
                            {chartConfig[name as keyof typeof chartConfig]?.label ?? name}
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
                <Bar
                  yAxisId="left"
                  dataKey="principal"
                  stackId="rata"
                  fill="var(--color-principal)"
                />
                <Bar
                  yAxisId="left"
                  dataKey="interest"
                  stackId="rata"
                  fill="var(--color-interest)"
                  stroke="var(--border)"
                />
                <Line
                  yAxisId="right"
                  dataKey="remaining"
                  type="monotone"
                  stroke="var(--color-remaining)"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ChartContainer>

            <Collapsible className="group/amort">
              <CollapsibleTrigger className="inline-flex items-center gap-1 text-sm font-medium hover:underline">
                <ChevronDown className="size-4 transition-transform group-data-[state=open]/amort:rotate-180" />
                <span className="group-data-[state=open]/amort:hidden">Mostra tabella annuale</span>
                <span className="hidden group-data-[state=open]/amort:inline">
                  Nascondi tabella annuale
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Anno</TableHead>
                        <TableHead className="text-right">Quota capitale</TableHead>
                        <TableHead className="text-right">Quota interessi</TableHead>
                        <TableHead className="text-right">Rata annua</TableHead>
                        <TableHead className="text-right">Debito residuo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.year}>
                          <TableCell>{r.year}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatEur(r.principal)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatEur(r.interest)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatEur(r.principal + r.interest)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatEur(r.remaining)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell>Totale</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatEur(totals.principal)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatEur(totals.interest)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatEur(totals.principal + totals.interest)}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </CardContent>
    </Card>
  );
}
