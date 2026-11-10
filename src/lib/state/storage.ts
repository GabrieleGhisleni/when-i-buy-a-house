import { DEFAULT_INPUTS, type HouseInputs } from "@/lib/finance";
import { parseState, serializeState } from "./schema";

export const STORAGE_KEY = "quando-compro-casa:v1";
export const EXPORT_FILENAME = "quando-compro-casa.json";

export function loadInputs(): HouseInputs {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (text) {
      const state = parseState(JSON.parse(text));
      if (state) return state.inputs;
    }
  } catch {
    // storage unavailable or corrupted: fall back to defaults
  }
  return DEFAULT_INPUTS;
}

export function saveInputs(inputs: HouseInputs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeState(inputs)));
  } catch {
    // quota exceeded / private mode: ignore
  }
}

export function exportJson(inputs: HouseInputs): void {
  const blob = new Blob([JSON.stringify(serializeState(inputs), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = EXPORT_FILENAME;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type ImportResult = { ok: true; inputs: HouseInputs } | { ok: false; error: string };

export async function importJson(file: File): Promise<ImportResult> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, error: "Impossibile leggere il file." };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "Il file non è un JSON valido." };
  }
  const state = parseState(raw);
  if (!state) {
    return { ok: false, error: "Il file non contiene dati validi per questa applicazione." };
  }
  return { ok: true, inputs: state.inputs };
}
