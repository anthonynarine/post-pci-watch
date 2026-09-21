// # Filename: src/features/monitoring/components/VitalCard.tsx
import {
  Droplets,
  Footprints,
  Gauge,
  HeartPulse,
  Thermometer,
  Wind,
  type LucideIcon,
} from "lucide-react";

import { StatusBadge } from "@/components/ui/StatusBadge";

import type { VitalIconName, VitalReading } from "../types/monitoring";

const ICONS: Record<VitalIconName, LucideIcon> = {
  heartRate: HeartPulse,
  oxygen: Droplets,
  respiration: Wind,
  activity: Footprints,
  temperature: Thermometer,
  bloodPressure: Gauge,
};

export function VitalCard({ reading }: { reading: VitalReading }) {
  const Icon = ICONS[reading.icon];

  return (
    <article className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-h-8 items-center gap-2 text-xs font-medium text-foreground-muted">
          <Icon aria-hidden="true" className="size-4" />
          {reading.label}
        </div>
        <StatusBadge tone={reading.status} label={reading.statusLabel} />
      </div>

      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tracking-tight text-foreground">
          {reading.value}
        </span>
        <span className="text-xs text-foreground-muted">{reading.unit}</span>
      </p>

      <p className="mt-2 text-xs text-foreground-muted">{reading.basis}</p>
      <p className="mt-1 text-xs text-foreground-muted">
        Observed <span className="font-mono">{reading.observedAt}</span>
      </p>
    </article>
  );
}
