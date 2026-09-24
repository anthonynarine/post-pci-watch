// # Filename: src/features/monitoring/components/LiveMonitoringEvents.tsx
"use client";

import { useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

import { useNow } from "../hooks/useNow";
import type { MonitoringEvent } from "../types/monitoring";
import { NoteworthyEvents } from "./NoteworthyEvents";

/**
 * Rule episodes stored by the server, plus one condition computed here: a measurement gap.
 *
 * The gap cannot be stored the way the other rules are. Those are evaluated when a reading is
 * written; a gap is the absence of writes, so nothing would ever run to record it. It is
 * derived from the latest reading's time and this client's clock, shown while it holds, and
 * not persisted anywhere.
 */

const EVENT_LIMIT = 10;

/** With a 5 s tick, 30 s is six missed readings. */
const GAP_AFTER_MS = 30_000;

function formatTimestamp(epochMs: number): string {
  return new Date(epochMs).toISOString().replace("T", " ").slice(0, 19);
}

function formatTime(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(11, 19);
}

export function LiveMonitoringEvents({ patientId }: { patientId: Id<"patients"> }) {
  const stored = useQuery(api.monitoringEvents.listForPatient, {
    patientId,
    limit: EVENT_LIMIT,
  });
  const current = useQuery(api.measurements.getCurrentVitals, { patientId });
  const simulator = useQuery(api.simulator.getForPatient, { patientId });
  const now = useNow(5_000);

  const events: MonitoringEvent[] = [];

  // Only meaningful while the simulator claims to be running: a stopped simulator is
  // expected to be silent.
  if (simulator?.status === "running" && current !== undefined && now !== null) {
    const latest = Math.max(0, ...current.map((reading) => reading.observedAt));
    const silentSince = Math.max(latest, simulator.startedAt);

    if (now - silentSince >= GAP_AFTER_MS) {
      events.push({
        id: "gap",
        title: "Measurement gap — ongoing",
        rule: "No measurement received for ≥ 30 s while the simulator is running",
        basis: `Last reading ${latest > 0 ? formatTimestamp(latest) : "never"}; computed on this screen, not stored`,
        detectedAt: formatTimestamp(silentSince + GAP_AFTER_MS),
        severity: "watch",
      });
    }
  }

  for (const event of stored ?? []) {
    const span =
      event.status === "open"
        ? `${formatTime(event.startedAt)} – ongoing`
        : `${formatTime(event.startedAt)} – ${formatTime(event.endedAt ?? event.lastObservedAt)}`;

    events.push({
      id: `${event.ruleId}-${event.startedAt}`,
      title: event.status === "open" ? `${event.title} — ongoing` : event.title,
      rule: `${event.ruleDescription} (${event.rulesVersion})`,
      basis: `${event.readingCount} qualifying readings, ${span} UTC; most extreme ${event.extremeValue}`,
      detectedAt: formatTimestamp(event.startedAt),
      severity: "watch",
    });
  }

  return <NoteworthyEvents events={events} />;
}
