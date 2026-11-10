import { useCallback, useEffect, useRef, useState } from "react";
import { applyCountryPreset, type Country, type HouseInputs } from "@/lib/finance";
import {
  exportJson,
  importJson,
  loadInputs,
  saveInputs,
  type ImportResult,
} from "@/lib/state/storage";

const SAVE_DEBOUNCE_MS = 300;

export function useHouseInputs() {
  const [inputs, setInputs] = useState<HouseInputs>(loadInputs);
  const latest = useRef(inputs);

  useEffect(() => {
    latest.current = inputs;
  }, [inputs]);

  useEffect(() => {
    const id = setTimeout(() => saveInputs(inputs), SAVE_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [inputs]);

  // Flush pending save when the tab is closed.
  useEffect(() => {
    const flush = () => saveInputs(latest.current);
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  const update = useCallback((partial: Partial<HouseInputs>) => {
    setInputs((prev) => ({ ...prev, ...partial }));
  }, []);

  const setCountry = useCallback((country: Country) => {
    setInputs((prev) => applyCountryPreset(prev, country));
  }, []);

  const resetCountryPreset = useCallback(() => {
    setInputs((prev) => applyCountryPreset(prev, prev.country));
  }, []);

  const importFromFile = useCallback(async (file: File): Promise<ImportResult> => {
    const result = await importJson(file);
    if (result.ok) setInputs(result.inputs);
    return result;
  }, []);

  const exportToFile = useCallback(() => exportJson(latest.current), []);

  return {
    inputs,
    setInputs,
    update,
    setCountry,
    resetCountryPreset,
    importFromFile,
    exportToFile,
  };
}

export type HouseInputsApi = ReturnType<typeof useHouseInputs>;
