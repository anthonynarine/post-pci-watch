// # Filename: src/app/dashboard/page.tsx
import { auth } from "@clerk/nextjs/server";

import {
  ClinicianReview,
  CURRENT_VITALS,
  DeviceStatus,
  MONITORING_DEVICE,
  NOTEWORTHY_EVENTS,
  NoteworthyEvents,
  PatientSummary,
  RECENT_MEASUREMENTS,
  RECOVERY_TIMELINE,
  RecentMeasurements,
  RecoveryTimeline,
  SNAPSHOT_AT,
  SYNTHETIC_PATIENT,
  SyntheticDataNotice,
  VitalsGrid,
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
          <VitalsGrid readings={CURRENT_VITALS} />
          <RecentMeasurements measurements={RECENT_MEASUREMENTS} />
          <NoteworthyEvents events={NOTEWORTHY_EVENTS} />
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
