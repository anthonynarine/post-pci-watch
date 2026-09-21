// # Filename: src/features/monitoring/data/device.ts
import type { MonitoringDevice } from "../types/monitoring";

export const MONITORING_DEVICE: MonitoringDevice = {
  id: "sim-wearable-01",
  model: "Simulated chest patch",
  connection: "degraded",
  connectionLabel: "Intermittent",
  lastSyncAt: "2026-03-14 14:32:09",
  batteryPercent: 46,
  sampleRate: "1 sample / 5 s",
  status: "watch",
};
