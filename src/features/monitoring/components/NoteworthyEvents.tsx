// # Filename: src/features/monitoring/components/NoteworthyEvents.tsx
import { SquareFunction } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";

import type { MonitoringEvent } from "../types/monitoring";

export function NoteworthyEvents({ events }: { events: MonitoringEvent[] }) {
  return (
    <Card
      title="Noteworthy events"
      description="Produced by explicit software rules over the stored measurements. Not measurements, and not model output. Thresholds are demo configuration, not clinical limits."
      icon={SquareFunction}
      action={<StatusBadge tone="neutral" label={`${events.length} in window`} />}
    >
      {events.length === 0 ? (
        <p className="text-xs text-foreground-muted">No rule has fired for this patient.</p>
      ) : null}
      <ul className="space-y-3">
        {events.map((event) => (
          <li
            key={event.id}
            className="rounded-lg border border-border bg-surface-raised p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="text-sm font-medium text-foreground">{event.title}</h3>
              <StatusBadge tone={event.severity} />
            </div>
            <dl className="mt-3 space-y-1.5 text-xs">
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-foreground-muted">Rule</dt>
                <dd className="font-mono text-foreground">{event.rule}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-foreground-muted">Derived from</dt>
                <dd className="text-foreground-muted">{event.basis}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-foreground-muted">Detected</dt>
                <dd className="font-mono text-foreground-muted">{event.detectedAt}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </Card>
  );
}
