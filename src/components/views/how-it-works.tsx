import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

function Group({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="border-t pt-3 first:border-t-0 first:pt-0">
      <h3 className="text-base font-semibold">
        <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
          {title}
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
          />
        </CollapsibleTrigger>
      </h3>
      <CollapsibleContent className="space-y-3 pt-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function Para({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function Items({ children }: { children: ReactNode }) {
  return <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">{children}</ul>;
}

function Formula({ label, children }: { label: string; children: ReactNode }) {
  return (
    <li>
      <span className="font-medium text-foreground">{label}:</span> {children}
    </li>
  );
}

export function HowItWorks() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Come funziona</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Group title="Ipotesi del modello" defaultOpen>
          <Para>
            Il modello fotografa la situazione di oggi: capitale, reddito e prezzo sono quelli che
            inserisci. Per simulare il futuro alza a mano gli input. Non c'è nessuna proiezione dei
            risparmi nel tempo.
          </Para>
          <Items>
            <li>
              Il calcolo è deterministico: stessi input, stesso risultato. Nessuna simulazione
              casuale.
            </li>
            <li>
              Tasso fisso annuo costante, uguale per tutte le durate. Nella realtà il tasso fisso
              segue l'IRS di pari durata, quindi confrontare durate diverse è una stima.
            </li>
            <li>
              Ammortamento alla francese: la rata è costante per tutta la durata. Ogni rata copre
              prima gli interessi del debito residuo, il resto riduce il capitale.
            </li>
            <li>
              Nessun tasso variabile e nessun TAEG: il costo del mutuo è solo il tasso fisso annuo.
            </li>
          </Items>
          <p className="text-sm font-medium">Fuori dalla v1:</p>
          <Items>
            <li>Proiezione dei risparmi nel tempo</li>
            <li>Scenari multipli con nome e confronto</li>
            <li>Altre rate in corso</li>
            <li>Spese mensili</li>
            <li>Fondo emergenza calcolato in mesi di spese</li>
            <li>Tasso diverso per ogni durata</li>
            <li>Garanzia Consap under 36</li>
            <li>Manutenzione e spese ricorrenti della casa</li>
            <li>Tasso variabile e TAEG</li>
            <li>Dettaglio regionale e preset per casa nuova</li>
            <li>Monte Carlo</li>
            <li>Backend e sincronizzazione tra dispositivi</li>
            <li>Pubblicazione online</li>
          </Items>
        </Group>

        <Group title="Formule in parole">
          <Items>
            <Formula label="Costi di acquisto">
              percentuale del prezzo (tasse, notaio, agenzia, costi del mutuo). <code>P × c</code>
            </Formula>
            <Formula label="Anticipo minimo">
              la parte del prezzo che la banca non finanzia, cioè il prezzo meno il massimo
              finanziabile. <code>P × (1 − LTV)</code>
            </Formula>
            <Formula label="Anticipo massimo">
              il capitale che resta dopo costi di acquisto, arredo e lavori e fondo emergenza, con
              tetto al prezzo. Se è sotto l'anticipo minimo, il capitale non basta.
            </Formula>
            <Formula label="Anticipo scelto">
              di default è il massimo. Lo slider va dal minimo al massimo; un valore manuale viene
              limitato a quell'intervallo a ogni calcolo.
            </Formula>
            <Formula label="Mutuo">
              prezzo meno anticipo scelto. Se è zero, il mutuo non serve.
            </Formula>
            <Formula label="Rata">
              ammortamento alla francese. <code>M = L × k</code>, con{" "}
              <code>k = i / (1 − (1 + i)^−n)</code>, dove i è il tasso annuo diviso 12 e n sono gli
              anni per 12. k è la rata per 1 € di mutuo; con tasso zero vale 1 / n.
            </Formula>
            <Formula label="Interessi totali">
              rata per numero di rate, meno il mutuo. <code>M × n − L</code>
            </Formula>
            <Formula label="Costo totale della casa">
              prezzo, più costi di acquisto, più interessi totali.
            </Formula>
            <Formula label="Rata/reddito">
              rata diviso reddito netto mensile. Il reddito netto mensile è il netto annuo diviso
              12, quindi include tredicesima e quattordicesima.
            </Formula>
            <Formula label="LTV effettivo">
              mutuo diviso prezzo. Non supera mai l'LTV massimo.
            </Formula>
            <Formula label="Liquidità residua">
              capitale meno anticipo, costi, arredo e lavori e fondo emergenza. Con anticipo al
              massimo vale zero. Se è negativa, il valore assoluto è il capitale mancante.
            </Formula>
          </Items>

          <p className="text-sm font-medium text-foreground">Semafori</p>
          <Items>
            <Formula label="Capitale">
              verde se l'anticipo massimo copre l'anticipo minimo, rosso altrimenti. Questa verifica
              include già il limite LTV.
            </Formula>
            <Formula label="Rata/reddito">
              verde fino alla soglia meno 5 punti percentuali, giallo nella banda di 5 punti sotto
              la soglia (es. soglia 30%: giallo tra 25% e 30%), rosso oltre la soglia. Grigio (n/d)
              se manca il reddito o il mutuo non serve (n/d).
            </Formula>
            <Formula label="Esito complessivo">
              rosso se una verifica è rossa, altrimenti giallo se una è gialla, altrimenti verde. Le
              verifiche n/d non contano, ma se manca il reddito l'esito lo segnala come incompleto.
            </Formula>
          </Items>

          <p className="text-sm font-medium text-foreground">Prezzo massimo</p>
          <Para>
            È il prezzo più alto per cui nessuna verifica è rossa, con anticipo al massimo, per ogni
            durata. Il capitale disponibile per la casa è K = capitale meno arredo e lavori meno
            fondo emergenza.
          </Para>
          <Items>
            <Formula label="Limite di capitale">
              <code>K / (1 − LTV + c)</code>. Non dipende dalla durata: è una retta orizzontale.
            </Formula>
            <Formula label="Limite di reddito">
              <code>(s × R / k + K) / (1 + c)</code>, dove s è la soglia rata/reddito e R il reddito
              mensile. Cresce con la durata, perché la rata per euro di mutuo diminuisce.
            </Formula>
            <Formula label="Prezzo massimo">
              il minore dei due limiti. Il vincolo che vince è quello che lo determina. Il prezzo
              "comodo" si calcola allo stesso modo con soglia meno 5 punti.
            </Formula>
            <Formula label="Casi particolari">
              se K è zero o negativo nessun prezzo è raggiungibile; senza reddito vale solo il
              limite di capitale.
            </Formula>
          </Items>
        </Group>

        <Group title="Fonti dei default e loro limiti">
          <Para>
            I default (costi di acquisto, LTV, rata/reddito, tassi, fondo emergenza, arredo e
            lavori) sono stati raccolti a novembre 2026. Le fonti sono in gran parte siti
            commerciali o di comparazione, quindi i valori sono indicativi: verificali con la tua
            banca e il tuo notaio prima di decidere.
          </Para>
          <Items>
            <li>
              <span className="font-medium text-foreground">Costi di acquisto, Italia:</span> circa
              4–8% del prezzo (2,5–4% senza agenzia). Fonti: dokicasa.it, money.it, studiomadera.it.
              La percentuale include i costi del mutuo, quindi per un acquisto in contanti i costi
              sono sovrastimati di circa 2–3 mila €.
            </li>
            <li>
              <span className="font-medium text-foreground">Costi di acquisto, Spagna:</span> circa
              7–13% del prezzo, con imposta di trasferimento che varia per regione. Fonti:
              arquitasa.com, gibobs.com, guiafiscal.es.
            </li>
            <li>
              <span className="font-medium text-foreground">LTV:</span> 80% in entrambi i paesi. In
              Italia la garanzia Consap under 36 può arrivare al 100%, ma è esclusa dal modello.
            </li>
            <li>
              <span className="font-medium text-foreground">Rata/reddito:</span> Italia 30% (con
              tetto bancario di circa 33–35%), Spagna 35% (range 30–40%). Fonti: immobiliare.it,
              hipotecas.me.
            </li>
            <li>
              <span className="font-medium text-foreground">Tassi fissi 20–30 anni:</span> Italia
              circa 3,5%, Spagna circa 3,0%. Riferimenti: TAEG medio Banca d'Italia (3,96% a maggio
              2026) e media INE di luglio 2026 (3,03%). Fonti: facile.it, ine.es. Il tasso reale
              dipende dalla durata e dall'IRS.
            </li>
            <li>
              <span className="font-medium text-foreground">Fondo emergenza:</span> 3–6 mesi di
              spese totali, rata compresa; per chi possiede casa si consigliano spesso 6–9 mesi. Non
              va usato per l'anticipo. Fonte: fool.com (articoli "The Ascent").
            </li>
            <li>
              <span className="font-medium text-foreground">Arredo e lavori:</span> arredo e
              trasloco circa 3–8% del prezzo (stima). Lavori leggeri 250–500 €/m², medi 600–900
              €/m², completi oltre 1.250 €/m². Fonti: studiomadera.it, cronoshare.it.
            </li>
          </Items>
        </Group>
      </CardContent>
    </Card>
  );
}
