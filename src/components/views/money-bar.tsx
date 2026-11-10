import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoPopover } from "@/components/info-popover";
import { formatEur, formatPct } from "@/lib/format";
import type { ViewProps } from "./types";

interface Segment {
  key: string;
  label: string;
  value: number;
  color: string;
}

export function MoneyBar({ inputs, scenario: s }: ViewProps) {
  const residual = Math.max(0, s.residualLiquidity);
  const segments: Segment[] = [
    { key: "dp", label: "Anticipo", value: s.downPayment, color: "bg-sky-500" },
    { key: "costs", label: "Costi di acquisto", value: s.purchaseCosts, color: "bg-violet-500" },
    {
      key: "furn",
      label: "Arredo + lavori",
      value: inputs.furnitureAndWorks,
      color: "bg-amber-500",
    },
    { key: "fund", label: "Fondo emergenza", value: inputs.emergencyFund, color: "bg-teal-500" },
    { key: "res", label: "Liquidità residua", value: residual, color: "bg-emerald-500" },
  ];
  const visible = segments.filter((x) => x.value > 0);
  // When capital is short the uses already sum to capital + missing: no extra segment.
  const total = visible.reduce((a, x) => a + x.value, 0);
  const missing = s.missingCapital;
  const covered = Math.max(0, total - missing);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          Dove vanno i tuoi soldi
          <InfoPopover title="Dove vanno i tuoi soldi">
            <p>
              Come viene ripartito il tuo capitale: anticipo, costi di acquisto, arredo e lavori,
              fondo emergenza e ciò che resta in liquidità.
            </p>
            <p>
              Se il capitale non basta, la barra rappresenta la somma necessaria e la barretta sotto
              mostra quanta parte è coperta dal capitale (verde) e quanta manca (rosso a righe).
            </p>
            <p>Leggi la larghezza di ogni segmento come quota sul totale.</p>
          </InfoPopover>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {total <= 0 ? (
          <p className="text-sm text-muted-foreground">
            Inserisci il capitale disponibile per vedere come verrebbe ripartito.
          </p>
        ) : (
          <>
            <div
              className="flex h-8 w-full overflow-hidden rounded-md bg-muted"
              role="img"
              aria-label="Ripartizione del capitale"
            >
              {visible.map((seg) => (
                <div
                  key={seg.key}
                  className={seg.color}
                  style={{ width: `${(seg.value / total) * 100}%` }}
                  title={`${seg.label}: ${formatEur(seg.value)}`}
                />
              ))}
            </div>
            {missing > 0 ? (
              <div className="space-y-1.5">
                <div
                  className="flex h-2 w-full overflow-hidden rounded-full bg-muted"
                  role="img"
                  aria-label="Parte coperta dal capitale e parte mancante"
                >
                  {covered > 0 ? (
                    <div
                      className="bg-emerald-500"
                      style={{ width: `${(covered / total) * 100}%` }}
                      title={`Coperto dal capitale: ${formatEur(covered)}`}
                    />
                  ) : null}
                  <div
                    className="bg-red-500"
                    style={{
                      width: `${(missing / total) * 100}%`,
                      backgroundImage:
                        "repeating-linear-gradient(45deg, rgba(255,255,255,0.45) 0 4px, transparent 4px 8px)",
                    }}
                    title={`Mancante: ${formatEur(missing)}`}
                  />
                </div>
                <p className="text-sm">
                  <span className="text-muted-foreground">
                    Coperto dal capitale: {formatEur(covered)} ({formatPct(covered / total)})
                  </span>
                  {" · "}
                  <span className="font-medium text-red-600 dark:text-red-400">
                    Mancante: {formatEur(missing)} ({formatPct(missing / total)})
                  </span>
                </p>
              </div>
            ) : null}
            <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((seg) => (
                <li key={seg.key} className="flex items-center gap-2">
                  <span aria-hidden className={`size-3 shrink-0 rounded-sm ${seg.color}`} />
                  <span className="min-w-0 flex-1 truncate">{seg.label}</span>
                  <span className="tabular-nums">{formatEur(seg.value)}</span>
                  <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">
                    {formatPct(seg.value / total)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
