// # Filename: src/features/monitoring/types/monitoring.ts

/**
 * Status vocabulary for the dashboard.
 *
 * These describe a value's relationship to a *configured threshold*, never a clinical
 * judgement. "normal" means "inside the range this software was configured with".
 */
export type ObservationStatus = "normal" | "watch" | "critical";

export type SyntheticPatient = {
  name: string;
  recordId: string;
  age: number;
  sex: string;
  procedure: string;
  stentLocation: string;
  procedureCompletedAt: string;
  monitoringSince: string;
  monitoringState: string;
  monitoringStatus: ObservationStatus;
};

/** Data files name an icon; the component maps the name to a Lucide component. */
export type VitalIconName =
  | "heartRate"
  | "oxygen"
  | "respiration"
  | "activity"
  | "temperature"
  | "bloodPressure";

export type VitalReading = {
  id: string;
  label: string;
  value: string;
  unit: string;
  observedAt: string;
  /** The configured range or definition this reading is being compared against. */
  basis: string;
  status: ObservationStatus;
  statusLabel: string;
  icon: VitalIconName;
};

export type MilestoneState = "complete" | "current" | "upcoming";

export type RecoveryMilestone = {
  id: string;
  label: string;
  at: string;
  state: MilestoneState;
  detail: string;
};

/** One raw observation exactly as a wearable would report it. */
export type Measurement = {
  id: string;
  observedAt: string;
  ingestedAt: string;
  type: string;
  value: string;
  unit: string;
  source: string;
};

/**
 * Output of a deterministic software rule, not an AI conclusion and not a measurement.
 * `rule` and `basis` keep the event traceable back to the observations that produced it.
 */
export type MonitoringEvent = {
  id: string;
  title: string;
  rule: string;
  basis: string;
  detectedAt: string;
  severity: ObservationStatus;
};

export type ConnectionState = "connected" | "degraded" | "offline";

export type MonitoringDevice = {
  id: string;
  model: string;
  connection: ConnectionState;
  connectionLabel: string;
  lastSyncAt: string;
  batteryPercent: number;
  sampleRate: string;
  status: ObservationStatus;
};
