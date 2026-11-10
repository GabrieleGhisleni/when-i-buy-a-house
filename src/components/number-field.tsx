import { useId, useRef, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { parseItNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface NumberFieldProps {
  /** Value in model units (percent mode: fraction, 0.035 for 3,5). null = empty. */
  value: number | null;
  onChange: (value: number | null) => void;
  /** Percent mode: displays value * 100. min/max stay in model units (fractions). */
  percent?: boolean;
  /** Suffix shown inside the field: "€", "%", "anni"... */
  suffix?: string;
  /** Max decimals shown (display units). Default 0 (percent: 1). */
  decimals?: number;
  min?: number;
  max?: number;
  /** Empty text is allowed and yields null. */
  nullable?: boolean;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  className?: string;
}

function clamp(n: number, min?: number, max?: number): number {
  let v = n;
  if (min !== undefined) v = Math.max(min, v);
  if (max !== undefined) v = Math.min(max, v);
  return v;
}

function toDisplay(value: number | null, percent: boolean, decimals: number): string {
  if (value === null) return "";
  const shown = percent ? value * 100 : value;
  // Trim trailing zeros up to `decimals`.
  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: decimals,
    useGrouping: "always",
  }).format(shown);
}

/** Decimals kept while editing: more than displayed, so focus+blur never rounds. */
function editDecimals(percent: boolean, decimals: number): number {
  return Math.max(decimals, percent ? 3 : 2);
}

/** Text input with it-IT formatting. Commits on blur / Enter. */
export function NumberField({
  value,
  onChange,
  percent = false,
  suffix,
  decimals,
  min,
  max,
  nullable = false,
  placeholder,
  disabled,
  id,
  "aria-label": ariaLabel,
  className,
}: NumberFieldProps) {
  const autoId = useId();
  const dec = decimals ?? (percent ? 1 : 0);
  const [draft, setDraft] = useState<string | null>(null); // non-null while focused/editing
  const text = draft ?? toDisplay(value, percent, dec);
  const initialEdit = useRef<string>("");
  const cancelled = useRef(false);

  function commit() {
    if (cancelled.current) {
      cancelled.current = false;
      setDraft(null);
      return;
    }
    if (draft === null) return;
    const trimmed = draft.trim();
    if (draft === initialEdit.current) {
      setDraft(null); // untouched: keep the stored value as is
      return;
    }
    if (trimmed === "") {
      if (nullable) onChange(null);
    } else {
      const parsed = parseItNumber(trimmed, { percent });
      if (parsed !== null) {
        const model = percent ? parsed / 100 : parsed;
        onChange(clamp(model, min, max));
      }
    }
    setDraft(null);
  }

  return (
    <div className={cn("relative", className)}>
      <Input
        id={id ?? autoId}
        aria-label={ariaLabel}
        inputMode="decimal"
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={text}
        onFocus={(e) => {
          const initial = toDisplay(value, percent, editDecimals(percent, dec));
          initialEdit.current = initial;
          cancelled.current = false;
          setDraft(initial);
          e.currentTarget.select();
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            cancelled.current = true;
            setDraft(null);
            e.currentTarget.blur();
          }
        }}
        className={cn("tabular-nums", suffix && "pr-12")}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
}

/** Decimal places of a step, e.g. 0.0005 -> 4, 1000 -> 0. */
function decimalsOf(step: number): number {
  const [, frac = ""] = String(step).split(".");
  return frac.length;
}

export interface SliderFieldProps extends Omit<NumberFieldProps, "value" | "onChange"> {
  value: number | null;
  onChange: (value: number | null) => void;
  /** Slider range in model units. Defaults to min/max. */
  sliderMin?: number;
  sliderMax?: number;
  step: number;
  /** Called when the slider (not the text) is moved to its upper end. */
  onSliderMax?: () => void;
  children?: ReactNode;
}

/** NumberField + Slider kept in sync. */
export function SliderField({
  value,
  onChange,
  sliderMin,
  sliderMax,
  step,
  onSliderMax,
  children,
  ...field
}: SliderFieldProps) {
  const lo = sliderMin ?? field.min ?? 0;
  const hi = sliderMax ?? field.max ?? 100;
  // Radix snaps to lo + k*step, so make the top position a step multiple >= hi:
  // the last position is then reachable and its (clamped) value equals hi exactly.
  const steps = hi > lo ? Math.ceil((hi - lo) / step - 1e-9) : 0;
  const trackMax = lo + steps * step;
  const digits = decimalsOf(step);
  return (
    <div className="space-y-2">
      <NumberField {...field} value={value} onChange={onChange} />
      <Slider
        min={lo}
        max={Math.max(trackMax, lo)}
        step={step}
        disabled={field.disabled || hi <= lo}
        value={[clamp(value ?? lo, lo, hi)]}
        aria-label={field["aria-label"]}
        onValueChange={([raw]) => {
          // toFixed strips the float noise accumulated by the step arithmetic.
          const v = Number(Math.min(raw, hi).toFixed(digits));
          if (v >= hi && onSliderMax) onSliderMax();
          else onChange(v);
        }}
      />
      {children}
    </div>
  );
}
