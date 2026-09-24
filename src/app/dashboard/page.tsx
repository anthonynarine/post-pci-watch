// # Filename: src/app/dashboard/page.tsx
import { auth } from "@clerk/nextjs/server";

import {
  ClinicianReview,
  DeviceStatus,
  MONITORING_DEVICE,
  MonitoringDataWorkspace,
  PatientSummary,
  RECOVERY_TIMELINE,
  RecoveryTimeline,
  SNAPSHOT_AT,
  SYNTHETIC_PATIENT,
  SyntheticDataNotice,
} from "@/features/monitoring";

export default async function DashboardPage() {
  // Protection lives on the resource, not only on the path. A signed-out document request
  // is redirected to sign-in before any monitoring data is rendered; the redirect carries
  // this URL so Clerk can return the user here afterwards.
  await auth.protect();

  return (
    <div className="space-y-6">
      <SyntheticDataNotice snapshotAt={SNAPSHOT_AT} />
      <PatientSummary patient={SYNTHETIC_PATIENT} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <MonitoringDataWorkspace />
        </div>

        <div className="space-y-6">
          <RecoveryTimeline milestones={RECOVERY_TIMELINE} />
          <DeviceStatus device={MONITORING_DEVICE} />
          <ClinicianReview />
        </div>
      </div>
    </div>
  );
}
