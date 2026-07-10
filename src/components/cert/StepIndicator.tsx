import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const STEPS = ["Upload Template", "Data & Mapping", "Preview & Generate"];

export function StepIndicator({ step, onGoto }: { step: number; onGoto: (s: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;
        return (
          <div key={label} className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => n < step && onGoto(n)}
              disabled={n > step}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                active && "bg-primary text-primary-foreground",
                done && "text-primary hover:bg-secondary",
                !active && !done && "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border text-xs",
                  active && "border-primary-foreground",
                  done && "border-primary bg-primary text-primary-foreground",
                  !active && !done && "border-muted-foreground",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : n}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {n < STEPS.length && <div className="h-px w-4 bg-border sm:w-8" />}
          </div>
        );
      })}
    </div>
  );
}