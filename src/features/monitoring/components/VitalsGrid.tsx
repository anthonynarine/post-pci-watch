// # Filename: src/features/monitoring/components/VitalsGrid.tsx
import type { VitalReading } from "../types/monitoring";
import { VitalCard } from "./VitalCard";

export function VitalsGrid({ readings }: { readings: VitalReading[] }) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Current observations
        </h2>
        <p className="text-xs text-foreground-muted">
          Latest reported value per measurement type
        </p>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {readings.map((reading) => (
          <VitalCard key={reading.id} reading={reading} />
        ))}
      </div>
    </section>
  );
}
