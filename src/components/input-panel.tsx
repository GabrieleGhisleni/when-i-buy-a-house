import { useRef, useState, type ReactNode } from "react";
import { Download, PanelLeftClose, PanelLeftOpen, RotateCcw, Upload } from "lucide-react";
import { InfoPopover } from "@/components/info-popover";
import { SliderField } from "@/components/number-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HouseInputsApi } from "@/hooks/use-house-inputs";
import type { Country, Scenario } from "@/lib/finance";
import { formatEur, formatPct } from "@/lib/format";

interface InputPanelProps {
  api: HouseInputsApi;
  scenario: Scenario;
  open: boolean;
  onToggle: () => void;
}

function Field({
  label,
  htmlFor,
  info,
  extra,
  children,
}: {
  label: string;
  htmlFor?: string;
  info: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <Label htmlFor={htmlFor}>{label}</Label>
        <InfoPopover title={label}>{info}</InfoPopover>
        {extra}
      </div>
      {children}
    </div>
  );
}

const SOURCES_NOTE = (
  <p className="italic">Fonti in gran parte commerciali o di comparazione: valori indicativi.</p>
);

export function InputPanel({ api, scenario, open, onToggle }: InputPanelProps) {
  const { inputs, update, setCountry, resetCountryPreset, importFromFile, exportToFile } = api;
  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  if (!open) {
    return (
      <Card className="gap-0 p-2 lg:p-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          aria-label="Mostra i tuoi dati"
          aria-expanded={false}
          className="mx-auto"
        >
          <PanelLeftOpen />
        </Button>
        <span className="mt-1 text-center text-sm font-medium lg:mt-3 lg:[writing-mode:vertical-rl]">
          I tuoi dati
        </span>
      </Card>
    );
  }

  const isMax = inputs.downPayment.mode === "max";
  const dpMin = Math.round(scenario.minDownPayment);
  const dpMax = Math.round(scenario.maxDownPayment);

  async function onFile(file: File | undefined) {
    if (!file) return;
    const result = await importFromFile(file);
    setImportError(result.ok ? null : result.error);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle>I tuoi dati</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          aria-label="Nascondi i tuoi dati"
          aria-expanded={true}
        >
          <PanelLeftClose />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field
          label="Capitale di partenza"
          htmlFor="capital"
          info={
            <>
              <p>Euro che hai a disposizione oggi, in liquidità.</p>
              <p>
                Da qui si tolgono anticipo, costi di acquisto, arredo + lavori e fondo emergenza.
                Per simulare il futuro, alzalo a mano.
              </p>
            </>
          }
        >
          <SliderField
            id="capital"
            value={inputs.capital}
            min={0}
            max={1e10}
            sliderMax={300_000}
            step={1000}
            suffix="€"
            aria-label="Capitale di partenza"
            onChange={(v) => update({ capital: v ?? 0 })}
          />
        </Field>

        <Field
          label="Reddito netto mensile"
          htmlFor="income"
          info={
            <>
              <p>
                Netto annuo diviso 12, così 13ª e 14ª sono comprese. Se il mutuo è cointestato, la
                somma dei redditi.
              </p>
              <p>
                Serve per il rapporto rata/reddito. Le banche guardano il reddito netto, di solito
                dalle ultime buste paga o dichiarazioni. Se lo lasci vuoto, la verifica non viene
                fatta.
              </p>
              {SOURCES_NOTE}
            </>
          }
        >
          <SliderField
            id="income"
            value={inputs.monthlyIncome}
            nullable
            min={0}
            max={1e10}
            sliderMax={10_000}
            step={100}
            suffix="€"
            placeholder="Non indicato"
            aria-label="Reddito netto mensile"
            onChange={(v) => update({ monthlyIncome: v })}
          />
        </Field>

        <Field
          label="Prezzo casa"
          htmlFor="price"
          info={
            <>
              <p>Prezzo di acquisto della casa che vuoi valutare.</p>
              <p>
                Su di esso si calcolano costi di acquisto, anticipo minimo (prezzo × (1 − LTV)) e
                mutuo necessario.
              </p>
            </>
          }
        >
          <SliderField
            id="price"
            value={inputs.price}
            min={0}
            max={1e10}
            sliderMax={1_000_000}
            step={5000}
            suffix="€"
            aria-label="Prezzo casa"
            onChange={(v) => update({ price: v ?? 0 })}
          />
        </Field>

        <Field
          label="Arredo + lavori"
          htmlFor="works"
          info={
            <>
              <p>Un unico importo in euro per mobili, trasloco e lavori di ristrutturazione.</p>
              <ul>
                <li>Arredo e trasloco: circa 3–8% del prezzo (stima).</li>
                <li>Lavori: leggeri 250–500 €/m², medi 600–900 €/m², completi oltre 1.250 €/m².</li>
              </ul>
              {SOURCES_NOTE}
            </>
          }
        >
          <SliderField
            id="works"
            value={inputs.furnitureAndWorks}
            min={0}
            max={1e10}
            sliderMax={150_000}
            step={1000}
            suffix="€"
            aria-label="Arredo + lavori"
            onChange={(v) => update({ furnitureAndWorks: v ?? 0 })}
          />
        </Field>

        <Field
          label="Fondo emergenza"
          htmlFor="emergency"
          info={
            <>
              <p>Importo fisso che tieni da parte e non usi per l&apos;anticipo.</p>
              <p>
                Riferimento: 3–6 mesi di spese totali, rata compresa; per chi possiede casa si
                consigliano spesso 6–9 mesi.
              </p>
              {SOURCES_NOTE}
            </>
          }
        >
          <SliderField
            id="emergency"
            value={inputs.emergencyFund}
            min={0}
            max={1e10}
            sliderMax={50_000}
            step={500}
            suffix="€"
            aria-label="Fondo emergenza"
            onChange={(v) => update({ emergencyFund: v ?? 0 })}
          />
        </Field>

        <Field
          label="Durata mutuo"
          htmlFor="years"
          info={
            <>
              <p>
                Anni di rimborso, da 5 a 40. Più è lunga, più la rata scende e più gli interessi
                totali salgono.
              </p>
              <p>Tipico: 20–30 anni.</p>
            </>
          }
        >
          <SliderField
            id="years"
            value={inputs.years}
            min={5}
            max={40}
            step={1}
            suffix="anni"
            aria-label="Durata mutuo"
            onChange={(v) => v !== null && update({ years: Math.round(v) })}
          />
        </Field>

        <div role="separator" className="flex items-center gap-3 py-2">
          <span className="h-0.5 flex-1 rounded bg-foreground/50" />
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
            Altri parametri
          </span>
          <span className="h-0.5 flex-1 rounded bg-foreground/50" />
        </div>

        <Field
          label="Paese"
          htmlFor="country"
          info={
            <>
              <p>
                Imposta i preset di costi di acquisto, LTV, rata/reddito e tasso. Ogni valore resta
                modificabile.
              </p>
              <p>Disponibili: Italia e Spagna (usato, senza dettaglio regionale).</p>
            </>
          }
        >
          <Select value={inputs.country} onValueChange={(v) => setCountry(v as Country)}>
            <SelectTrigger id="country" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IT">Italia</SelectItem>
              <SelectItem value="ES">Spagna</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Costi di acquisto"
          htmlFor="costs"
          info={
            <>
              <p>
                Percentuale del prezzo per tasse, notaio, agenzia e costi del mutuo. Costi = prezzo
                × %.
              </p>
              <ul>
                <li>
                  <strong>Italia</strong> (prima casa da privato): circa 4–8%, 2,5–4% senza agenzia.
                  Preset 6%.
                </li>
                <li>
                  <strong>Spagna</strong> (usato): circa 7–13% (ITP: Madrid 6%, Andalusia 7%,
                  Catalogna 10%, altre 8–10%). Preset 10%.
                </li>
              </ul>
              <p>
                In Italia la % comprende i costi del mutuo: per un acquisto in contanti sovrastima
                di circa 2–3k €.
              </p>
              {SOURCES_NOTE}
            </>
          }
        >
          <SliderField
            id="costs"
            value={inputs.purchaseCostRate}
            percent
            min={0}
            max={1}
            sliderMax={0.15}
            step={0.001}
            decimals={1}
            suffix="%"
            aria-label="Costi di acquisto"
            onChange={(v) => update({ purchaseCostRate: v ?? 0 })}
          />
        </Field>

        <Field
          label="LTV massimo"
          htmlFor="ltv"
          info={
            <>
              <p>
                Quota massima del prezzo che la banca finanzia. Determina l&apos;anticipo minimo:
                prezzo × (1 − LTV).
              </p>
              <p>
                Tipico: 80% sia in Italia sia in Spagna. La garanzia Consap under 36 (fino al 100%)
                è esclusa dal modello.
              </p>
            </>
          }
        >
          <SliderField
            id="ltv"
            value={inputs.maxLtv}
            percent
            min={0}
            max={1}
            sliderMin={0.5}
            sliderMax={1}
            step={0.005}
            suffix="%"
            aria-label="LTV massimo"
            onChange={(v) => update({ maxLtv: v ?? 0 })}
          />
        </Field>

        <Field
          label="Rata/reddito massima"
          htmlFor="dti"
          info={
            <>
              <p>
                Soglia oltre cui la banca di solito non concede il mutuo: rata mensile / reddito
                netto mensile. Il giallo scatta 5 punti percentuali sotto la soglia.
              </p>
              <ul>
                <li>
                  <strong>Italia</strong>: 30%, con tetto bancario circa 33–35%.
                </li>
                <li>
                  <strong>Spagna</strong>: 35%, intervallo 30–40%.
                </li>
              </ul>
              {SOURCES_NOTE}
            </>
          }
        >
          <SliderField
            id="dti"
            value={inputs.maxInstallmentToIncome}
            percent
            min={0}
            max={1}
            sliderMin={0.2}
            sliderMax={0.45}
            step={0.005}
            suffix="%"
            aria-label="Rata/reddito massima"
            onChange={(v) => update({ maxInstallmentToIncome: v ?? 0 })}
          />
        </Field>

        <Field
          label="Tasso fisso annuo"
          htmlFor="rate"
          info={
            <>
              <p>
                Tasso nominale annuo fisso, uguale per tutte le durate. Rata alla francese con tasso
                mensile = tasso / 12.
              </p>
              <ul>
                <li>
                  <strong>Italia</strong>: circa 3,5% (intervallo 3,0–4,0%); migliori offerte
                  intorno a 3,25%.
                </li>
                <li>
                  <strong>Spagna</strong>: circa 3,0% (intervallo 2,5–3,5%); migliori offerte
                  intorno a 2,55%.
                </li>
              </ul>
              <p>
                Nella realtà il fisso dipende dalla durata (segue l&apos;IRS di pari durata); il
                modello usa lo stesso tasso per tutte.
              </p>
              {SOURCES_NOTE}
            </>
          }
        >
          <SliderField
            id="rate"
            value={inputs.annualRate}
            percent
            decimals={2}
            min={0}
            max={1}
            sliderMax={0.06}
            step={0.0005}
            suffix="%"
            aria-label="Tasso fisso annuo"
            onChange={(v) => update({ annualRate: v ?? 0 })}
          />
        </Field>

        <Field
          label="Anticipo"
          htmlFor="down"
          info={
            <>
              <p>
                Quanto versi subito. Va dal minimo (prezzo × (1 − LTV)) al massimo disponibile
                (capitale − costi − arredo − fondo, al massimo il prezzo).
              </p>
              <p>
                Mutuo = prezzo − anticipo. Un anticipo più alto abbassa rata e interessi ma lascia
                meno liquidità.
              </p>
            </>
          }
          extra={
            isMax && scenario.capitalSufficient ? <Badge variant="secondary">Massimo</Badge> : null
          }
        >
          <SliderField
            id="down"
            value={scenario.downPayment}
            min={dpMin}
            max={dpMax}
            step={500}
            suffix="€"
            aria-label="Anticipo"
            disabled={!scenario.capitalSufficient}
            onChange={(v) =>
              v !== null &&
              update({ downPayment: v >= dpMax ? { mode: "max" } : { mode: "custom", value: v } })
            }
            onSliderMax={() => update({ downPayment: { mode: "max" } })}
          >
            {scenario.capitalSufficient ? (
              <p className="text-xs text-muted-foreground">
                Tra {formatEur(scenario.minDownPayment)} ({formatPct(1 - inputs.maxLtv, 0)} del
                prezzo) e {formatEur(scenario.maxDownPayment)}.
              </p>
            ) : (
              <p className="text-xs text-destructive" role="status">
                Capitale insufficiente: calcolato con l&apos;anticipo minimo (
                {formatEur(scenario.minDownPayment)}).
              </p>
            )}
          </SliderField>
        </Field>

        <div className="flex flex-col gap-2 border-t pt-4">
          <Button variant="outline" size="sm" onClick={resetCountryPreset}>
            <RotateCcw /> Ripristina preset paese
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={exportToFile}>
              <Download /> Esporta JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload /> Importa JSON
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          {importError && (
            <p role="alert" className="text-xs text-destructive">
              {importError}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
