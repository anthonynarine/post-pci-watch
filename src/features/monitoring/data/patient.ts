// # Filename: src/features/monitoring/data/patient.ts
import type { SyntheticPatient } from "../types/monitoring";

/** Every timestamp on the dashboard is read against this fixed synthetic clock. */
export const SNAPSHOT_AT = "2026-03-14 14:32:08";

export const SYNTHETIC_PATIENT: SyntheticPatient = {
  name: "Rosa M. Delgado",
  recordId: "SYN-0001",
  age: 64,
  sex: "Female",
  procedure: "Elective PCI, single drug-eluting stent",
  stentLocation: "Mid left anterior descending artery",
  procedureCompletedAt: "2026-03-14 09:12",
  monitoringSince: "2026-03-14 11:00",
  monitoringState: "Monitoring active",
  monitoringStatus: "normal",
};
