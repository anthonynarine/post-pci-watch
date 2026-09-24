// # Filename: src/features/monitoring/components/LiveVitals.tsx
"use client";

import { useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";

import { useNow } from "../hooks/useNow";
import type { VitalIconName, VitalReading } from "../types/monitoring";
import { VitalCard } from "./VitalCard";

/**
 * Current status: the latest stored reading of each live vital, plus the simulator's activity
 * state. Replaces the hardcoded fixture cards, which showed values no database held.
 *
 * The badges describe freshness only — whether a reading is recent — never whether a value is
 * clinically acceptable. That is Phase 10's deterministic rules, not this component.
 */

/** A reading older than this is shown as "Not current". Six missed simulator ticks. */
const FRESH_WITHIN_MS = 30_000;

const VITALS: ReadonlyArray<{
  type: Doc<"measurements">["measurementType"];
  label: string;
  icon: VitalIconName;
}> = [
  { type: "heartRate", label: "Heart rate", icon: "heartRate" },
  { type: "spo2", label: "SpO₂", icon: "oxygen" },
  { type: "respiratoryRate", label: "Respiratory rate", icon: "respiration" },
];

const ORIGIN_LABELS: Record<Doc<"measurements">["origin"], string> = {
  systemProducer: "From the synthetic wearable simulator",
  userManualControl: "From manual entry",
  seedFixture: "From seed fixture data",
};

const ACTIVITY_LABELS: Record<Doc<"simulators">["activityState"], string> = {
  SLEEPING: "Sleeping",
  RESTING: "Resting",
  WALKING: "Walking",
  RECOVERY: "Recovering",
};

function formatTimestamp(epochMs: number): string {
  return new Date(epochMs).toISOString().replace("T", " ").slice(0, 19);
}

export function LiveVitals({ patientId }: { patientId: Id<"patients"> }) {
  const current = useQuery(api.measurements.getCurrentVitals, { patientId });
  const simulator = useQuery(api.simulator.getForPatient, { patientId });
  const now = useNow(5_000);

  const readings: VitalReading[] = VITALS.map(({ type, label, icon }) => {
    const reading = current?.find((row) => row.measurementType === type);

    if (reading === undefined) {
      return {
        id: type,
        label,
        icon,
        value: current === undefined ? "…" : "—",
        unit: "",
        observedAt: "—",
        basis: current === undefined ? "Loading" : "No reading stored",
        status: "watch",
        statusLabel: current === undefined ? "Loading" : "No data",
      };
    }

    const fresh = now !== null && now - reading.observedAt <= FRESH_WITHIN_MS;

    return {
      id: type,
      label,
      icon,
      value: String(reading.value),
      unit: reading.unit,
      observedAt: formatTimestamp(reading.observedAt),
      basis: ORIGIN_LABELS[reading.origin],
      status: fresh ? "normal" : "watch",
      statusLabel: fresh ? "Live" : "Not current",
    };
  });

  const running = simulator?.status === "running";

  readings.push({
    id: "activity",
    label: "Activity state",
    icon: "activity",
    value: running ? ACTIVITY_LABELS[simulator.activityState] : "—",
    unit: running ? "simulator state" : "",
    observedAt: running ? "at the latest tick" : "—",
    basis: running ? "Reported by the running simulator" : "Simulator stopped",
    status: running ? "normal" : "watch",
    statusLabel: running ? "Live" : "Not running",
  });

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Current observations
        </h2>
        <p className="text-xs text-foreground-muted">
          Latest stored value per vital · &ldquo;Live&rdquo; means observed in the last 30 s
        </p>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {readings.map((reading) => (
          <VitalCard key={reading.id} reading={reading} />
        ))}
      </div>
    </section>
  );
}
