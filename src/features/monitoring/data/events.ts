// # Filename: src/features/monitoring/data/events.ts
import type { MonitoringEvent } from "../types/monitoring";

/**
 * Hardcoded stand-ins for what Phase 10 will derive from the measurement stream with
 * explicit software rules. Nothing here is an AI conclusion.
 */
export const NOTEWORTHY_EVENTS: MonitoringEvent[] = [
  {
    id: "e-003",
    title: "SpO2 below configured threshold",
    rule: "SpO2 < 94 % sustained for ≥ 5 minutes",
    basis: "9 consecutive SpO2 measurements, 14:27:12 – 14:32:08, source sim-wearable-01",
    detectedAt: "2026-03-14 14:32:09",
    severity: "watch",
  },
  {
    id: "e-002",
    title: "Heart rate elevated during ambulation",
    rule: "Heart rate > 110 bpm while activity state is WALKING",
    basis: "4 heart-rate measurements, 13:41:20 – 13:43:02, source sim-wearable-01",
    detectedAt: "2026-03-14 13:43:04",
    severity: "watch",
  },
  {
    id: "e-001",
    title: "Measurement gap",
    rule: "No measurement of any type received for ≥ 10 minutes",
    basis: "Gap between 12:04:11 and 12:19:47, source sim-wearable-01",
    detectedAt: "2026-03-14 12:14:11",
    severity: "critical",
  },
];
