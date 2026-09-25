// # Filename: src/features/monitoring/components/WindowSummary.tsx
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { ChartNoAxesColumn } from "lucide-react";

import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { Card } from "@/components/ui/Card";

import { useNow } from "../hooks/useNow";
import { Sparkline } from "./Sparkline";

/**
 * Count, min, mean, max, and latest per vital over the last 5 minutes or the last hour.
 *
 * The window start is computed here and passed to the query, because a query may not read the
 * clock. `useNow` steps every 15 s, so `since` changes at most that often; between steps, new
 * readings still arrive through the subscription. A reading can therefore stay counted for up
 * to 15 s after it leaves the window — the stated cost of not resubscribing on every render.
 */

const WINDOWS = [
  { id: "5m", label: "Last 5 minutes", ms: 5 * 60_000 },
  { id: "1h", label: "Last hour", ms: 60 * 60_000 },
] as const;

type WindowId = (typeof WINDOWS)[number]["id"];

const TYPE_LABELS: Record<Doc<"measurements">["measurementType"], string> = {
  heartRate: "Heart rate",
  spo2: "SpO₂",
  respiratoryRate: "Respiratory rate",
  skinTemperature: "Skin temperature",
};

export function WindowSummary({ patientId }: { patientId: Id<"patients"> }) {
  const [windowId, setWindowId] = useState<WindowId>("5m");
  const now = useNow(15_000);

  const selected = WINDOWS.find((window) => window.id === windowId) ?? WINDOWS[0];

  const summary = useQuery(
    api.measurements.summarizeWindow,
    now === null ? "skip" : { patientId, since: now - selected.ms },
  );

  return (
    <Card
      title="Window summary"
      description="Per-vital statistics and trend over a recent window. Descriptive only; no thresholds are applied."
      icon={ChartNoAxesColumn}
      action={
        <div role="group" aria-label="Time window" className="flex shrink-0 gap-1">
          {WINDOWS.map((window) => (
            <button
              key={window.id}
              type="button"
              onClick={() => setWindowId(window.id)}
              aria-pressed={window.id === windowId}
              className="rounded-md border border-border px-2 py-1 text-xs text-foreground-muted transition-colors hover:text-foreground aria-pressed:bg-surface-raised aria-pressed:font-medium aria-pressed:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {window.label}
            </button>
          ))}
        </div>
      }
    >
      {summary === undefined ? (
        <p className="text-xs text-foreground-muted">Loading window…</p>
      ) : summary.vitals.length === 0 ? (
        <p className="text-xs text-foreground-muted">
          No readings in the {selected.label.toLowerCase()}. Start the simulator to generate
          some.
        </p>
      ) : (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[38rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-medium text-foreground-muted">
                <th scope="col" className="px-1 py-2">Vital</th>
                <th scope="col" className="px-1 py-2 text-right">Readings</th>
                <th scope="col" className="px-1 py-2 text-right">Min</th>
                <th scope="col" className="px-1 py-2 text-right">Mean</th>
                <th scope="col" className="px-1 py-2 text-right">Max</th>
                <th scope="col" className="px-1 py-2 text-right">Latest</th>
                <th scope="col" className="px-1 py-2">Unit</th>
                <th scope="col" className="px-1 py-2">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono text-xs">
              {summary.vitals.map((vital) => (
                <tr key={vital.measurementType}>
                  <td className="px-1 py-2 font-sans text-sm text-foreground">
                    {TYPE_LABELS[vital.measurementType]}
                  </td>
                  <td className="px-1 py-2 text-right text-foreground-muted">{vital.count}</td>
                  <td className="px-1 py-2 text-right text-foreground">{vital.min}</td>
                  <td className="px-1 py-2 text-right text-foreground">{vital.mean}</td>
                  <td className="px-1 py-2 text-right text-foreground">{vital.max}</td>
                  <td className="px-1 py-2 text-right text-foreground">{vital.latest}</td>
                  <td className="px-1 py-2 font-sans text-foreground-muted">{vital.unit}</td>
                  <td className="px-1 py-2">
                    <Sparkline
                      points={vital.trend}
                      label={TYPE_LABELS[vital.measurementType]}
                      unit={vital.unit}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {summary?.truncated ? (
        <p className="mt-2 text-xs text-foreground-muted">
          Showing the most recent 1,000 readings per vital; older readings in this window are
          not included.
        </p>
      ) : null}
    </Card>
  );
}
