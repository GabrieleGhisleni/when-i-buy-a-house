import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface InfoPopoverProps {
  title: string;
  children: ReactNode;
  className?: string;
}

/** ⓘ button opening a Popover (not a Tooltip: tooltips do not open on tap). */
export function InfoPopover({ title, children, className }: InfoPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Informazioni"
          className={cn(
            "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            className,
          )}
        >
          <Info className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-w-[calc(100vw-2rem)] gap-2 p-3" align="start">
        <p className="text-sm font-medium">{title}</p>
        <div className="space-y-2 text-xs/relaxed text-muted-foreground [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-4">
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
}
