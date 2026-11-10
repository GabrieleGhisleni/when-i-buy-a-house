# Quando compro casa: piano di implementazione (alto livello)

Dashboard personale, solo front-end, che risponde a: **"con il capitale che ho, che casa posso comprare, con che mutuo, che rata e quanti interessi totali?"**

Serve per esplorare rapidamente lo spazio delle possibilità. Ad esempio: "ho 150.000 €, casa da 200k: serve il mutuo? Casa da 400k: mutuo a 30 anni o a 10? Che rata?".

## Decisioni fissate

- **Ambito**: fotografia di oggi + durata del mutuo. Il capitale di partenza è un input, quindi per simulare il futuro lo si alza a mano.
- **Utente**: solo io. Niente account, niente generalizzazioni.
- **Mercati**: Italia e Spagna tramite preset modificabili, senza dettaglio regionale né preset per casa nuova.
- **Modello**: deterministico, tasso fisso costante e uguale per tutte le durate, ammortamento alla francese (rata costante). Niente tasso variabile, niente TAEG.
- **Persistenza**: localStorage con salvataggio automatico, più Esporta/Importa JSON. Nessun backend, niente Next.js.
- **Stack**: Vite + React + TypeScript + Tailwind + shadcn/ui, grafici con Recharts (shadcn charts), validazione con zod, test con Vitest. Lint e format restano oxlint/oxfmt. Interfaccia in italiano, solo €.
- **Esecuzione**: in locale (`pnpm dev`). Il build statico resta pubblicabile in seguito senza modifiche (`base: './'` in Vite, così funziona anche in un sotto-percorso).
- **Spiegazioni ovunque**: ogni input, scheda e grafico ha una ⓘ con cosa rappresenta, come si calcola e i valori tipici. La ⓘ apre un Popover, non un Tooltip, perché il Tooltip non si apre al tocco su mobile.

## Input e default

Al primo avvio la dashboard parte dallo scenario d'esempio (capitale, reddito e prezzo sotto), così nessuna vista è vuota.

| Input                 | Default             | Note                                                                  |
| --------------------- | ------------------- | --------------------------------------------------------------------- |
| Paese                 | IT                  | Imposta i preset sotto; ogni valore resta modificabile                |
| Capitale di partenza  | 150.000 € (esempio) | € disponibili oggi                                                    |
| Reddito netto mensile | 3.000 € (esempio)   | Netto annuo / 12, quindi 13ª e 14ª comprese. Se cointestato, la somma |
| Prezzo casa           | 200.000 € (esempio) | €                                                                     |
| Arredo + lavori       | 20.000 €            | Un unico importo assoluto                                             |
| Fondo emergenza       | 15.000 €            | Importo fisso. Riferimento: 3–6 mesi di spese totali, rata compresa   |
| Costi di acquisto     | IT 6% / ES 10%      | % del prezzo: tasse, notaio, agenzia, costi del mutuo                 |
| LTV massimo           | 80%                 | Quota massima del prezzo finanziabile dalla banca                     |
| Rata/reddito massima  | IT 30% / ES 35%     | Soglia oltre la quale la banca di solito non concede il mutuo         |
| Tasso fisso annuo     | IT 3,5% / ES 3,0%   | Lo stesso per tutte le durate                                         |
| Durata mutuo          | 25 anni             | Slider 5–40 anni                                                      |
| Anticipo              | Massimo disponibile | Slider tra anticipo minimo e massimo                                  |

## Modello di calcolo

Notazione: P = prezzo, C = capitale, c = % costi di acquisto, A = arredo + lavori, F = fondo emergenza, LTV = LTV massimo, R = reddito netto mensile, s = soglia rata/reddito, L = mutuo, M = rata.

- **Costi di acquisto** = P × c
- **Anticipo minimo** = P × (1 − LTV)
- **Anticipo massimo** = min(P, max(0, C − P × c − A − F))
- **Anticipo scelto**: lo stato salva `{ mode: "max" }` oppure `{ mode: "custom", value }`. Il valore custom viene limitato all'intervallo [minimo, massimo] a ogni calcolo, quindi cambiare prezzo non lo porta mai fuori intervallo. Portare lo slider al massimo riporta il modo a `"max"`.
- **Capitale insufficiente** (anticipo massimo < anticipo minimo): lo slider è disattivato e lo scenario si calcola con l'anticipo minimo, cioè "cosa servirebbe". La liquidità residua diventa negativa e il suo valore assoluto è il capitale mancante.
- **Mutuo necessario** = P − anticipo scelto. Se è 0, il mutuo non serve.
- **Rata** (alla francese): M = L × k, con k = i / (1 − (1 + i)^−n), i = tasso annuo / 12 e n = anni × 12. Con tasso 0: k = 1 / n. k è la rata per 1 € di mutuo.
- **Interessi totali** = M × n − L
- **Totale restituito alla banca** = M × n
- **Costo totale della casa** = P + costi di acquisto + interessi totali
- **Rapporto rata/reddito** = M / R
- **LTV effettivo** = L / P. Per costruzione non supera mai l'LTV massimo.
- **Liquidità residua** = C − anticipo − costi − A − F. Con anticipo al massimo vale 0, a meno che la casa non sia pagabile interamente in contanti.

Tutti i calcoli restano in virgola mobile; l'arrotondamento avviene solo nella visualizzazione.

### Verifiche di fattibilità (semafori)

| Verifica     | Verde                              | Giallo           | Rosso                                                          | n/d                                           |
| ------------ | ---------------------------------- | ---------------- | -------------------------------------------------------------- | --------------------------------------------- |
| Capitale     | Anticipo massimo ≥ anticipo minimo | —                | Il capitale non copre anticipo minimo + costi + arredo + fondo | —                                             |
| Rata/reddito | ≤ s − 5 pp                         | Tra s − 5 pp e s | Oltre s                                                        | Reddito mancante, oppure mutuo non necessario |

La verifica "Capitale" comprende già il limite LTV: l'anticipo minimo è proprio P × (1 − LTV). Per questo non c'è un semaforo LTV separato; l'LTV effettivo resta come dato informativo nelle schede.

Banda gialla: 5 punti percentuali sotto la soglia rata/reddito (es. soglia 30% → giallo tra 25% e 30%).

**Esito complessivo**: rosso se una verifica è rossa; altrimenti giallo se una verifica è gialla; altrimenti verde. Le verifiche n/d non contano, ma se manca il reddito l'esito lo segnala come incompleto.

### Prezzo massimo raggiungibile (per durata)

Il prezzo più alto P per cui nessuna verifica è rossa (giallo accettato), con anticipo al massimo. Ha una forma chiusa, quindi non serve la bisezione.

Con K = C − A − F (capitale disponibile per la casa) e k calcolato per la durata:

- **Limite di capitale**: P_capitale = K / (1 − LTV + c). Non dipende dalla durata.
- **Limite di reddito**: P_reddito = (s × R / k + K) / (1 + c). Cresce con la durata.
- **Prezzo massimo** = min(P_capitale, P_reddito). Il vincolo che limita è quello con il valore minore.
- Se K ≤ 0 nessun prezzo è raggiungibile. Se manca il reddito vale solo P_capitale.
- Entrambi i limiti sono ≥ K / (1 + c), il prezzo pagabile tutto in contanti, quindi l'acquisto senza mutuo non richiede casi speciali.
- Lo stesso calcolo con soglia s − 5 pp dà il prezzo massimo "comodo" (verde).

## Fasi

### 1. Setup progetto

- Scaffold Vite + React + TS in una cartella temporanea, poi unione nel repo esistente: `create vite` in una cartella non vuota rischia di sovrascrivere `package.json`. Restano oxlint/oxfmt e gli script esistenti.
- Alias `@/*` in `tsconfig.json`, `tsconfig.app.json` e `vite.config.ts`, richiesto da shadcn/ui.
- Tailwind + shadcn/ui (card, slider, input, popover, tooltip, switch, select, table, chart).
- `base: './'` in `vite.config.ts`.
- Vitest configurato. Script `test`, `dev`, `build`, `typecheck` (`tsc -b`): né oxlint né Vite controllano i tipi.
- `.oxlintrc.json`: aggiungere i plugin `react` (regole degli hook) e `vitest`, e `env.browser`.

### 2. Motore di calcolo (`src/lib/finance`, puro, senza React)

- Funzioni: rata, interessi totali, piano di ammortamento annuale, scenario completo, verifiche, prezzo massimo per durata con vincolo limitante.
- Preset paese come dati (un oggetto per IT e uno per ES).
- Test Vitest, con `toBeCloseTo` per i confronti tra numeri decimali:
  - valori noti, confrontati con un calcolatore esterno e con la tabella "Valori di controllo" (fase 6);
  - tasso 0;
  - mutuo non necessario;
  - capitale insufficiente: scenario all'anticipo minimo e capitale mancante corretto;
  - anticipo custom fuori intervallo: viene limitato;
  - soglia rata/reddito, banda gialla, reddito mancante (n/d);
  - piano di ammortamento: la somma delle quote capitale è uguale al mutuo, il debito residuo finale è ~0, la somma delle quote interessi è uguale agli interessi totali;
  - prezzo massimo: la formula chiusa coincide con una bisezione usata come riferimento nei test, il vincolo limitante è corretto, il prezzo cresce (o resta uguale) con la durata.

### 3. Stato e persistenza

- Un unico oggetto di stato degli input, con un campo `version` per compatibilità futura.
- Un solo schema zod, usato sia per leggere il localStorage sia per l'import JSON. Se `version` è più vecchia, si migra; se lo schema non è valido, si torna ai default.
- Salvataggio automatico in localStorage, letto e scritto in try/catch con fallback ai default.
- **Esporta JSON**: scarica il file. **Importa JSON**: carica e valida; se non è valido, mostra un errore.
- **Ripristina preset paese**.

### 4. Layout e input

- Pannello input: sidebar su desktop, in cima su mobile. Slider e campi numerici sono collegati.
- Campi numerici in formato italiano: accettano "3,5" e "200.000" e mostrano i separatori it-IT. Niente `type="number"`, che gestisce male la virgola decimale.
- Cambiare paese applica i preset: costi, rata/reddito, tasso, LTV.
- Ogni input ha una ⓘ con cosa rappresenta e i valori tipici IT/ES (vedi "Riferimenti per i tooltip").

### 5. Viste

1. **Schede di riepilogo**:
   - serve il mutuo sì/no, importo del mutuo, rata, interessi totali, totale restituito alla banca, costo totale della casa;
   - LTV effettivo, rata/reddito, liquidità residua (o capitale mancante);
   - semaforo complessivo, più un semaforo per ogni verifica.
2. **Matrice prezzo × durata** (sempre con anticipo al massimo):
   - colonne 10/15/20/25/30 anni;
   - righe di prezzo centrate sul prezzo scelto (−50%…+50%, 9 righe), con passo arrotondato a 5.000 o 10.000 € e range modificabile; senza prezzo, stato vuoto;
   - ogni cella mostra la rata ed è colorata per fattibilità;
   - il tooltip della cella mostra interessi totali e rapporto rata/reddito; su mobile le stesse informazioni si vedono caricando la cella;
   - clic su una cella per caricare prezzo e durata nello scenario corrente;
   - la ⓘ ricorda che tutte le durate usano lo stesso tasso, mentre nella realtà il fisso segue l'IRS di pari durata.
3. **Prezzo massimo per durata** (anticipo al massimo):
   - grafico durata (5–40 anni) × prezzo massimo raggiungibile, con indicato il vincolo che limita ogni punto (capitale o reddito);
   - linea tratteggiata per il prezzo massimo "comodo" (soglia − 5 pp);
   - il limite di capitale è una retta orizzontale: se il grafico la raggiunge, indicare la durata oltre la quale allungare il mutuo non permette una casa più cara.
4. **Anticipo ↔ rata**: al variare dell'anticipo (minimo → massimo), mostra rata, interessi totali e liquidità residua.
5. **Dove vanno i tuoi soldi**:
   - barra unica che divide il capitale in anticipo, costi di acquisto, arredo + lavori, fondo emergenza e liquidità residua;
   - se il capitale non basta, mostra la parte mancante.
6. **Piano di ammortamento**:
   - quota capitale e quota interessi per anno (barre impilate);
   - debito residuo (linea);
   - tabella annuale espandibile.
7. **Come funziona**: ipotesi del modello, formule in parole, fonti dei default e loro limiti.

Ogni scheda e ogni grafico ha una ⓘ: cosa mostra, come si calcola, come leggerlo.

### 6. Rifinitura e verifica

- Formattazione € e percentuali con `Intl` it-IT.
- Responsive fino alla larghezza di un telefono.
- Tema chiaro/scuro.
- Stati vuoti e valori non validi: capitale 0, prezzo 0, reddito mancante.
- Lint, format, typecheck e test verdi.
- Prova manuale degli scenari d'esempio con i valori di controllo sotto.

**Valori di controllo** (capitale 150k, arredo 20k, fondo 15k, costi 6%, LTV 80%, tasso 3,5%):

| Scenario           | Mutuo     | Rata     | Interessi totali |
| ------------------ | --------- | -------- | ---------------- |
| Casa 200k, 10 anni | 97.000 €  | ~959 €   | ~18.100 €        |
| Casa 200k, 30 anni | 97.000 €  | ~436 €   | ~59.800 €        |
| Casa 400k, 10 anni | 309.000 € | ~3.056 € | ~57.700 €        |
| Casa 400k, 30 anni | 309.000 € | ~1.388 € | ~190.500 €       |

Con la casa da 200k il mutuo serve comunque: costi, arredo e fondo assorbono 47k del capitale. Il limite di capitale è ~442.300 €; con reddito 3.000 € il prezzo massimo è ~278.100 € a 25 anni, limitato dal reddito.

## Riferimenti per i tooltip (ricerca, novembre 2026)

Fonti in gran parte commerciali o di comparazione, quindi indicative. Vanno mostrate come tali nella sezione "Come funziona".

**Reddito netto mensile**

- Netto annuo diviso 12, così 13ª e 14ª sono comprese.
- Le banche guardano il reddito netto, di solito dalle ultime buste paga o dichiarazioni.

**Fondo emergenza**

- 3–6 mesi di spese totali (rata compresa); per chi possiede casa si consigliano spesso 6–9 mesi.
- Da non usare per l'anticipo.
- Fonti: fool.com (articoli "The Ascent" sul fondo emergenza per chi compra casa).

**Arredo + lavori**

- Arredo e trasloco circa 3–8% del prezzo (stima).
- Lavori leggeri 250–500 €/m², medi 600–900 €/m², completi oltre 1.250 €/m².
- Fonti: studiomadera.it, cronoshare.it.

**Costi di acquisto, Italia** (prima casa da privato): ~4–8% del prezzo (~2,5–4% senza agenzia).

- Registro 2% sul valore catastale, pari a circa 0,8–1,4% del prezzo di mercato.
- Notaio ~1,5–2,5k per l'atto + ~1–1,5k per il mutuo.
- Agenzia 2–3% + IVA.
- Imposta sostitutiva 0,25% del mutuo, istruttoria 0–1k, perizia 300–600 €.
- Casa nuova da costruttore: IVA 4%.
- La % comprende i costi del mutuo, quindi per un acquisto in contanti sovrastima i costi di circa 2–3k.
- Fonti: dokicasa.it, money.it, studiomadera.it.

**Costi di acquisto, Spagna** (usato): ~7–13% del prezzo.

- ITP: Madrid 6%, Andalusia 7%, Catalogna 10%, altre regioni 8–10%.
- Notaio, registro e gestoría ~1,3–2,2k.
- Dal 2019 i costi del mutuo sono a carico della banca, tranne la tasación.
- Casa nuova: IVA 10% + AJD.
- Fonti: arquitasa.com, gibobs.com, guiafiscal.es.

**LTV**

- 80% sia in IT sia in ES.
- In Italia la garanzia Consap under 36 può arrivare al 100%, ma è esclusa dal modello per scelta.

**Rata/reddito**

- IT: 30%, con tetto bancario ~33–35%.
- ES: 35%, range 30–40%.
- Fonti: immobiliare.it, hipotecas.me.

**Tassi fissi 20–30 anni**

- IT: ~3,5% (range 3,0–4,0%). TAEG medio Banca d'Italia 3,96% a maggio 2026; migliori offerte ~3,25%.
- ES: ~3,0% (range 2,5–3,5%). Media INE di luglio 2026: 3,03%; migliori offerte ~2,55%.
- Il tasso fisso reale dipende dalla durata (segue l'IRS di pari durata); il modello usa lo stesso tasso per tutte.
- Fonti: facile.it, ine.es.

## Fuori dalla v1 (deciso)

- Proiezione dei risparmi nel tempo
- Scenari multipli con nome e confronto
- Altre rate in corso
- Spese mensili
- Fondo emergenza calcolato in mesi di spese (richiede le spese mensili)
- Tasso diverso per ogni durata
- Garanzia Consap under 36
- Manutenzione e spese ricorrenti della casa
- Tasso variabile e TAEG
- Dettaglio regionale e preset per casa nuova
- Monte Carlo
- Backend e sincronizzazione tra dispositivi
- Pubblicazione online
