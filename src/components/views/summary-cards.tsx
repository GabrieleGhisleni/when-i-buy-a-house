import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoPopover } from "@/components/info-popover";
import { formatEur, formatPct } from "@/lib/format";
import type { Light } from "@/lib/finance";
import { cn } from "@/lib/utils";
import { TrafficLight } from "./traffic-light";
import type { ViewProps } from "./types";

function capitalText(light: Light, missing: number): string {
  if (light === "green")
    return "Il capitale copre anticipo minimo, costi, arredo e fondo emergenza.";
  if (light === "red")
    return `Il capitale non basta${missing > 0 ? `: mancano ${formatEur(missing)}` : ""}.`;
  return "Verifica non disponibile.";
}

function installmentText(light: Light, ratio: number | null, threshold: number): string {
  if (light === "na") return "Serve il reddito netto (e un mutuo) per valutare la rata.";
  const r = ratio === null ? "" : formatPct(ratio);
  const t = formatPct(threshold, 0);
  if (light === "green") return `Rata/reddito ${r}: ben sotto la soglia del ${t}.`;
  if (light === "yellow") return `Rata/reddito ${r}: vicino alla soglia del ${t}.`;
  return `Rata/reddito ${r}: oltre la soglia del ${t}.`;
}

function Tile({
  title,
  info,
  value,
  sub,
  danger,
}: {
  title: string;
  info: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  danger?: boolean;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-sm font-medium text-muted-foreground">
          {title}
          <InfoPopover title={title}>{info}</InfoPopover>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "text-2xl font-semibold tabular-nums",
            danger && "text-red-600 dark:text-red-400",
          )}
        >
          {value}
        </div>
        {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}

export function SummaryCards({ inputs, scenario: s }: ViewProps) {
  const threshold = inputs.maxInstallmentToIncome;
  const ratio = s.installmentToIncome;
  const ratioLight = s.checks.installment;
  const ratioDanger = ratioLight === "red";

  return (
    <section className="space-y-4" aria-label="Riepilogo">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="flex flex-wrap items-center gap-2">
              Esito complessivo
              <TrafficLight light={s.overall} />
              {s.incomplete ? (
                <span className="text-xs font-normal text-muted-foreground">
                  incompleto: manca il reddito
                </span>
              ) : null}
            </span>
            <InfoPopover title="Esito complessivo">
              <p>
                Sintesi delle verifiche di fattibilità. È <strong>rosso</strong> se almeno una
                verifica è rossa, <strong>giallo</strong> se nessuna è rossa ma una è gialla,
                altrimenti <strong>verde</strong>.
              </p>
              <p>
                Le verifiche non disponibili (n.d.) non contano; senza reddito l'esito è incompleto.
              </p>
            </InfoPopover>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              Capitale <TrafficLight light={s.checks.capital} />
            </div>
            <p className="text-xs text-muted-foreground">
              {capitalText(s.checks.capital, s.missingCapital)}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              Rata/reddito <TrafficLight light={ratioLight} />
            </div>
            <p className="text-xs text-muted-foreground">
              {installmentText(ratioLight, ratio, threshold)}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Tile
          title="Serve il mutuo?"
          value={s.needsMortgage ? "Sì" : "No"}
          sub={
            s.needsMortgage ? "L'anticipo non copre tutto il prezzo." : "Paghi tutto in contanti."
          }
          info={
            <p>
              Serve un mutuo se l'anticipo scelto è inferiore al prezzo della casa. Importo del
              mutuo = prezzo − anticipo.
            </p>
          }
        />
        <Tile
          title="Importo mutuo"
          value={formatEur(s.loan)}
          sub={`Anticipo ${formatEur(s.downPayment)}`}
          info={
            <p>
              Quanto chiedi alla banca: <strong>prezzo − anticipo</strong>. L'anticipo è quello
              scelto (o il massimo possibile), entro i limiti di LTV e capitale.
            </p>
          }
        />
        <Tile
          title="Rata mensile"
          value={s.needsMortgage ? formatEur(s.installment) : "—"}
          sub={
            s.needsMortgage
              ? `${inputs.years} anni al ${formatPct(inputs.annualRate, 2)}`
              : undefined
          }
          info={
            <p>
              Rata fissa con ammortamento alla francese: importo × k, dove k dipende da tasso e
              durata. Non include assicurazioni o spese di gestione del mutuo.
            </p>
          }
        />
        <Tile
          title="Interessi totali"
          value={formatEur(s.totalInterest)}
          info={
            <p>
              Somma degli interessi pagati in tutta la durata:{" "}
              <strong>rata × mesi − importo</strong>. È il costo del denaro preso in prestito.
            </p>
          }
        />
        <Tile
          title="Totale restituito alla banca"
          value={formatEur(s.totalRepaid)}
          info={<p>Capitale + interessi, cioè tutte le rate pagate. Non comprende l'anticipo.</p>}
        />
        <Tile
          title="Costo totale della casa"
          value={formatEur(s.totalHouseCost)}
          sub={`di cui costi di acquisto ${formatEur(s.purchaseCosts)}`}
          info={
            <p>
              Anticipo + costi di acquisto (tasse, notaio, agenzia) + totale restituito alla banca.
              Esclude arredo e lavori.
            </p>
          }
        />
        <Tile
          title="LTV effettivo"
          value={formatPct(s.effectiveLtv)}
          sub={`Massimo consentito ${formatPct(inputs.maxLtv, 0)}`}
          info={
            <p>
              Loan-to-value: quota del prezzo finanziata dal mutuo. Più è alto, più la banca è
              esposta e più il tasso tende a salire.
            </p>
          }
        />
        <Tile
          title="Rata/reddito"
          value={ratio === null || ratioLight === "na" ? "n.d." : formatPct(ratio)}
          danger={ratioDanger}
          sub={
            ratioLight === "na"
              ? s.needsMortgage
                ? "Serve il reddito netto per valutare la rata."
                : "Nessun mutuo necessario: nessuna rata."
              : `Soglia ${formatPct(threshold, 0)} del reddito netto`
          }
          info={
            <p>
              Rata mensile divisa per il reddito netto mensile. Verde sotto soglia − 5 punti, giallo
              fino alla soglia, rosso oltre. Non disponibile senza reddito o senza mutuo.
            </p>
          }
        />
        {s.missingCapital > 0 ? (
          <Tile
            title="Capitale mancante"
            value={formatEur(s.missingCapital)}
            danger
            sub="Per coprire anticipo minimo, costi, arredo e fondo."
            info={
              <p>
                Quanto ti manca per coprire anticipo minimo, costi di acquisto, arredo/lavori e
                fondo emergenza con il capitale attuale.
              </p>
            }
          />
        ) : (
          <Tile
            title="Liquidità residua"
            value={formatEur(s.residualLiquidity)}
            sub="Dopo anticipo, costi, arredo e fondo emergenza."
            info={
              <p>
                Capitale − anticipo − costi di acquisto − arredo e lavori − fondo emergenza. È il
                margine che resta libero.
              </p>
            }
          />
        )}
      </div>
    </section>
  );
}
