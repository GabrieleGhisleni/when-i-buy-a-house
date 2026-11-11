import { useMemo, useState } from "react";
import { InputPanel } from "@/components/input-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useHouseInputs } from "@/hooks/use-house-inputs";
import { computeScenario } from "@/lib/finance";
import { AmortizationView } from "@/components/views/amortization";
import { DownPaymentChart } from "@/components/views/down-payment-chart";
import { HowItWorks } from "@/components/views/how-it-works";
import { MaxPriceChart } from "@/components/views/max-price-chart";
import { MoneyBar } from "@/components/views/money-bar";
import { PriceDurationMatrix } from "@/components/views/price-duration-matrix";
import { RateDurationMatrix } from "@/components/views/rate-duration-matrix";
import { RatePage } from "@/components/views/rate-page";
import { SummaryCards } from "@/components/views/summary-cards";
import type { ViewProps } from "@/components/views/types";

const NAV = [
  ["riepilogo", "Riepilogo"],
  ["matrice", "Prezzo × durata"],
  ["matrice-tasso", "Tasso × durata"],
  ["prezzo-massimo", "Prezzo massimo"],
  ["anticipo", "Anticipo e rata"],
  ["ammortamento", "Ammortamento"],
  ["come-funziona", "Come funziona"],
] as const;

type Page = "calcolatore" | "tassi";

export default function App() {
  const api = useHouseInputs();
  const { inputs } = api;
  const scenario = useMemo(() => computeScenario(inputs), [inputs]);
  const viewProps: ViewProps = { inputs, scenario, update: api.update };
  const [panelOpen, setPanelOpen] = useState(true);
  const [page, setPage] = useState<Page>("calcolatore");
  const onRatePage = page === "tassi";

  return (
    <TooltipProvider>
      <div className="min-h-svh overflow-x-hidden bg-background text-foreground">
        <header className="border-b">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">When I Buy a House</h1>
              <p className="text-sm text-muted-foreground">
                Che casa posso comprare, con che mutuo e che rata?
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={onRatePage ? "default" : "outline"}
                aria-pressed={onRatePage}
                onClick={() => setPage(onRatePage ? "calcolatore" : "tassi")}
              >
                {onRatePage ? "Calcolatore" : "Tassi e rate"}
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {onRatePage ? (
          <main className="mx-auto max-w-7xl px-4 py-6">
            <RatePage />
          </main>
        ) : (
          <div
            className={`mx-auto grid max-w-7xl gap-6 px-4 py-6 ${
              panelOpen ? "lg:grid-cols-[360px_minmax(0,1fr)]" : "lg:grid-cols-[auto_minmax(0,1fr)]"
            }`}
          >
            <aside className="lg:sticky lg:top-4 lg:max-h-[calc(100svh-2rem)] lg:self-start lg:overflow-y-auto">
              <InputPanel
                api={api}
                scenario={scenario}
                open={panelOpen}
                onToggle={() => setPanelOpen((o) => !o)}
              />
            </aside>

            <main className="min-w-0 space-y-6">
              <nav
                aria-label="Sezioni"
                className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 text-sm"
              >
                {NAV.map(([id, label]) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className="shrink-0 rounded-full border px-3 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {label}
                  </a>
                ))}
              </nav>
              <section id="riepilogo" className="scroll-mt-4 space-y-6">
                <SummaryCards {...viewProps} />
                <MoneyBar {...viewProps} />
              </section>
              <section id="matrice" className="scroll-mt-4">
                <PriceDurationMatrix {...viewProps} />
              </section>
              <section id="matrice-tasso" className="scroll-mt-4">
                <RateDurationMatrix {...viewProps} />
              </section>
              <section id="prezzo-massimo" className="scroll-mt-4">
                <MaxPriceChart {...viewProps} />
              </section>
              <section id="anticipo" className="scroll-mt-4">
                <DownPaymentChart {...viewProps} />
              </section>
              <section id="ammortamento" className="scroll-mt-4">
                <AmortizationView {...viewProps} />
              </section>
              <section id="come-funziona" className="scroll-mt-4">
                <HowItWorks />
              </section>
            </main>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
