import type { Light } from "@/lib/finance";
import { cn } from "@/lib/utils";

const STYLES: Record<Light, { label: string; dot: string; badge: string }> = {
  green: {
    label: "Verde",
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  yellow: {
    label: "Attenzione",
    dot: "bg-amber-500",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  red: {
    label: "Rosso",
    dot: "bg-red-500",
    badge: "bg-red-500/15 text-red-700 dark:text-red-300",
  },
  na: {
    label: "n.d.",
    dot: "bg-muted-foreground/50",
    badge: "bg-muted text-muted-foreground",
  },
};

export function lightLabel(light: Light): string {
  return STYLES[light].label;
}

/** Small badge: colored dot + Italian text. `label` overrides the default text. */
export function TrafficLight({
  light,
  label,
  className,
}: {
  light: Light;
  label?: string;
  className?: string;
}) {
  const s = STYLES[light];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        s.badge,
        className,
      )}
    >
      <span aria-hidden className={cn("size-2 rounded-full", s.dot)} />
      {label ?? s.label}
    </span>
  );
}
