// # Filename: convex/fixtures.ts
import type { Infer } from "convex/values";

import type { measurementType, sourceType } from "./schema";

/**
 * Fixture data for the per-user demo patient. Plain constants, no registered functions:
 * this module is imported by a mutation, it is not itself callable.
 *
 * Timestamps are fixed constants, never Date.now(). Every user's demo patient therefore
 * carries identical values, which is what makes "user B sees different data" a meaningful
 * result: the difference can only come from ownership, never from the fixture.
 */
export const DEMO_KEY = "demo-patient-001";

export const PROCEDURE_COMPLETED_AT = Date.parse("2026-03-14T09:12:00Z");
export const SNAPSHOT_AT = Date.parse("2026-03-14T14:32:08Z");

const SECOND = 1000;

export const DEMO_PATIENT = {
  demoKey: DEMO_KEY,
  name: "Rosa M. Delgado",
  age: 64,
  procedure: "Elective PCI, single drug-eluting stent",
  procedureCompletedAt: PROCEDURE_COMPLETED_AT,
  monitoringStatus: "active" as const,
  isSynthetic: true as const,
};

type MeasurementFixture = {
  measurementType: Infer<typeof measurementType>;
  value: number;
  unit: string;
  observedSecondsAgo: number;
  ingestDelaySeconds: number;
  sourceDeviceId: string;
  sourceType: Infer<typeof sourceType>;
};

export const MEASUREMENT_FIXTURES: MeasurementFixture[] = [
  { measurementType: "heartRate", value: 78, unit: "bpm", observedSecondsAgo: 0, ingestDelaySeconds: 1, sourceDeviceId: "sim-wearable-01", sourceType: "simulatedWearable" },
  { measurementType: "spo2", value: 93, unit: "%", observedSecondsAgo: 0, ingestDelaySeconds: 1, sourceDeviceId: "sim-wearable-01", sourceType: "simulatedWearable" },
  { measurementType: "respiratoryRate", value: 17, unit: "breaths/min", observedSecondsAgo: 3, ingestDelaySeconds: 2, sourceDeviceId: "sim-wearable-01", sourceType: "simulatedWearable" },
  { measurementType: "heartRate", value: 81, unit: "bpm", observedSecondsAgo: 65, ingestDelaySeconds: 1, sourceDeviceId: "sim-wearable-01", sourceType: "simulatedWearable" },
  { measurementType: "spo2", value: 93, unit: "%", observedSecondsAgo: 65, ingestDelaySeconds: 1, sourceDeviceId: "sim-wearable-01", sourceType: "simulatedWearable" },
  { measurementType: "skinTemperature", value: 36.9, unit: "°C", observedSecondsAgo: 128, ingestDelaySeconds: 2, sourceDeviceId: "sim-wearable-01", sourceType: "simulatedWearable" },
  { measurementType: "spo2", value: 92, unit: "%", observedSecondsAgo: 130, ingestDelaySeconds: 3, sourceDeviceId: "sim-wearable-01", sourceType: "simulatedWearable" },
  { measurementType: "heartRate", value: 84, unit: "bpm", observedSecondsAgo: 190, ingestDelaySeconds: 1, sourceDeviceId: "sim-wearable-01", sourceType: "simulatedWearable" },
  { measurementType: "respiratoryRate", value: 18, unit: "breaths/min", observedSecondsAgo: 193, ingestDelaySeconds: 2, sourceDeviceId: "sim-wearable-01", sourceType: "simulatedWearable" },
  { measurementType: "heartRate", value: 76, unit: "bpm", observedSecondsAgo: 255, ingestDelaySeconds: 1, sourceDeviceId: "sim-wearable-01", sourceType: "simulatedWearable" },
  { measurementType: "spo2", value: 94, unit: "%", observedSecondsAgo: 255, ingestDelaySeconds: 1, sourceDeviceId: "sim-wearable-01", sourceType: "simulatedWearable" },
  { measurementType: "skinTemperature", value: 36.8, unit: "°C", observedSecondsAgo: 428, ingestDelaySeconds: 2, sourceDeviceId: "sim-wearable-01", sourceType: "simulatedWearable" },
];

export function observedAtFor(fixture: MeasurementFixture): number {
  return SNAPSHOT_AT - fixture.observedSecondsAgo * SECOND;
}

export function ingestedAtFor(fixture: MeasurementFixture): number {
  return observedAtFor(fixture) + fixture.ingestDelaySeconds * SECOND;
}
