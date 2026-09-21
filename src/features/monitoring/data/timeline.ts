// # Filename: src/features/monitoring/data/timeline.ts
import type { RecoveryMilestone } from "../types/monitoring";

export const RECOVERY_TIMELINE: RecoveryMilestone[] = [
  {
    id: "procedure-complete",
    label: "Procedure complete",
    at: "2026-03-14 09:12",
    state: "complete",
    detail: "Radial access, single drug-eluting stent placed",
  },
  {
    id: "sheath-removed",
    label: "Sheath removed",
    at: "2026-03-14 10:05",
    state: "complete",
    detail: "Radial compression band applied",
  },
  {
    id: "monitoring-started",
    label: "Remote monitoring started",
    at: "2026-03-14 11:00",
    state: "complete",
    detail: "Synthetic wearable paired to record SYN-0001",
  },
  {
    id: "first-ambulation",
    label: "First ambulation",
    at: "2026-03-14 13:40",
    state: "complete",
    detail: "Simulator reported WALKING for 6 minutes",
  },
  {
    id: "observation-window",
    label: "Observation window",
    at: "2026-03-14 14:32",
    state: "current",
    detail: "Continuous synthetic monitoring in progress",
  },
  {
    id: "review-checkpoint",
    label: "Scheduled review checkpoint",
    at: "2026-03-14 18:00",
    state: "upcoming",
    detail: "Clinician review of the monitoring window",
  },
];
