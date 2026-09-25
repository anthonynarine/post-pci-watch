// # Filename: src/features/monitoring/components/SyntheticDataNotice.tsx
import { FlaskConical } from "lucide-react";

export function SyntheticDataNotice() {
  return (
    <div className="flex flex-wrap items-start gap-3 rounded-xl border border-primary/30 bg-primary-soft px-4 py-3">
      <FlaskConical aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">Synthetic data</p>
        <p className="mt-0.5 text-xs text-foreground-muted">
          Every patient detail, measurement, and event on this page is fabricated. Live
          readings come from a software simulator, not a real wearable. This is not a medical
          device, and it must not be used for clinical decision-making.
        </p>
      </div>
    </div>
  );
}
