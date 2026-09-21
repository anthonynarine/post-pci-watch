// # Filename: src/features/monitoring/components/RecentMeasurements.tsx
import { Table2 } from "lucide-react";

import { Card } from "@/components/ui/Card";

import type { Measurement } from "../types/monitoring";

export function RecentMeasurements({ measurements }: { measurements: Measurement[] }) {
  return (
    <Card
      title="Recent measurements"
      description="Raw observations as reported. Observation time and ingestion time are recorded separately."
      icon={Table2}
    >
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-medium text-foreground-muted">
              <th scope="col" className="px-1 py-2">
                Observed
              </th>
              <th scope="col" className="px-1 py-2">
                Type
              </th>
              <th scope="col" className="px-1 py-2 text-right">
                Value
              </th>
              <th scope="col" className="px-1 py-2">
                Unit
              </th>
              <th scope="col" className="hidden px-1 py-2 lg:table-cell">
                Source
              </th>
              <th scope="col" className="hidden px-1 py-2 lg:table-cell">
                Ingested
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {measurements.map((measurement) => (
              <tr key={measurement.id}>
                <td className="px-1 py-2 font-mono text-xs text-foreground-muted">
                  {measurement.observedAt}
                </td>
                <td className="px-1 py-2 text-foreground">{measurement.type}</td>
                <td className="px-1 py-2 text-right font-mono text-foreground">
                  {measurement.value}
                </td>
                <td className="px-1 py-2 text-xs text-foreground-muted">{measurement.unit}</td>
                <td className="hidden px-1 py-2 font-mono text-xs text-foreground-muted lg:table-cell">
                  {measurement.source}
                </td>
                <td className="hidden px-1 py-2 font-mono text-xs text-foreground-muted lg:table-cell">
                  {measurement.ingestedAt}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
