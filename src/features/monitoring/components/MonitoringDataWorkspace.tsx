// # Filename: src/features/monitoring/components/MonitoringDataWorkspace.tsx
"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { DatabaseZap } from "lucide-react";

import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { useConvexConnectionRecovery } from "@/components/convex/ConvexClientProvider";
import { Card } from "@/components/ui/Card";

import { useRecordPatientWorkspaceAccess } from "../hooks/useRecordPatientWorkspaceAccess";
import type { Measurement } from "../types/monitoring";
import { LiveConnectionLost } from "./LiveConnectionLost";
import { RecentMeasurements } from "./RecentMeasurements";
import { RecordSyntheticHeartRate } from "./RecordSyntheticHeartRate";
import { SyntheticActivityHistory } from "./SyntheticActivityHistory";

/**
 * The dashboard's only Client Component. It is one because `useQuery` holds a live WebSocket
 * subscription, which needs a component that survives the request and can re-render when a
 * message arrives.
 */

const RECENT_LIMIT = 9;

const TYPE_LABELS: Record<Doc<"measurements">["measurementType"], string> = {
  heartRate: "Heart rate",
  spo2: "SpO₂",
  respiratoryRate: "Respiratory rate",
  skinTemperature: "Skin temperature",
};

/**
 * Convex stores timestamps as numbers. Formatting is a presentation concern, so it happens
 * here rather than in the database. UTC and a fixed layout, not toLocaleString(): a
 * locale-dependent string would render differently on different machines.
 */
function formatTimestamp(epochMs: number): string {
  return new Date(epochMs).toISOString().replace("T", " ").slice(0, 19);
}

/** Maps a stored document onto the props the presentational table already expects. */
function toMeasurementRow(doc: Doc<"measurements">): Measurement {
  return {
    id: doc._id,
    observedAt: formatTimestamp(doc.observedAt),
    ingestedAt: formatTimestamp(doc.ingestedAt),
    type: TYPE_LABELS[doc.measurementType],
    value: String(doc.value),
    unit: doc.unit,
    source: doc.sourceDeviceId,
  };
}

function WorkspaceNotice({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card title="Recent measurements" description="Live from Convex." icon={DatabaseZap}>
      <div className="rounded-lg border border-dashed border-border bg-surface-raised p-4">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <div className="mt-2 text-xs text-foreground-muted">{children}</div>
      </div>
    </Card>
  );
}

export function MonitoringDataWorkspace() {
  // Clerk being signed in is not the same as Convex holding a verified token. There is a
  // window after page load in which the session exists but the token has not been fetched
  // and handed to the Convex client yet. Firing a protected query during that window sends
  // it unauthenticated, and the server correctly rejects it.
  //
  // Both hooks are read because neither alone distinguishes the three states this component
  // has to tell apart. Convex reports `isLoading: false, isAuthenticated: false` for two
  // very different situations — "the user is signed out" and "the user is signed in but
  // token acquisition failed". Only Clerk's `isSignedIn` separates them, and collapsing them
  // is exactly what produced S-20's permanent "Authenticating with Convex…" screen.
  const { isLoaded: clerkLoaded, isSignedIn } = useAuth();
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const { tokenFetchFailed } = useConvexConnectionRecovery();

  // "skip" keeps the subscription declared but closed until Convex itself reports ready.
  const patient = useQuery(api.patients.getMyDemoPatient, isAuthenticated ? {} : "skip");

  // Dependent query: the patient's _id is required before its measurements can be asked for.
  const measurements = useQuery(
    api.measurements.listRecentForPatient,
    patient ? { patientId: patient._id, limit: RECENT_LIMIT } : "skip",
  );

  // Called unconditionally, as hooks must be; it does nothing until a patient has loaded
  // through an authenticated subscription.
  useRecordPatientWorkspaceAccess(patient?._id);

  const ensureMyDemoPatient = useMutation(api.patients.ensureMyDemoPatient);
  const [creating, setCreating] = useState(false);

  // Clerk has not reported yet. Nothing below can be decided until it has.
  if (!clerkLoaded) {
    return (
      <WorkspaceNotice title="Authenticating with Convex…">
        Waiting for a verified token before opening any protected subscription.
      </WorkspaceNotice>
    );
  }

  // Signed out is not a connection failure and must never be recovered from automatically.
  // The route is protected, so this is normally only the instant after a sign-out.
  if (!isSignedIn) {
    return (
      <WorkspaceNotice title="Signed out">
        This session has ended. Sign in again to reopen the monitoring subscription.
      </WorkspaceNotice>
    );
  }

  // State 3 — Clerk holds a live session but no token reached Convex. This branch is tested
  // BEFORE the loading branch on purpose: after a failed re-attempt Convex reports
  // isLoading: true even though authentication has definitively failed, and reporting that
  // as progress is the S-20 misreport this remediation exists to remove.
  if (!isAuthenticated && tokenFetchFailed) {
    return <LiveConnectionLost />;
  }

  // State 1 — genuinely in progress: Convex has not yet heard back about the token.
  if (authLoading) {
    return (
      <WorkspaceNotice title="Authenticating with Convex…">
        Waiting for a verified token before opening any protected subscription.
      </WorkspaceNotice>
    );
  }

  // Resolved, and the answer was no — a token was obtained but the deployment rejected it,
  // or the connection dropped after authentication.
  if (!isAuthenticated) {
    return <LiveConnectionLost />;
  }

  if (patient === undefined) {
    return (
      <WorkspaceNotice title="Connecting to Convex…">
        Opening the subscription.
      </WorkspaceNotice>
    );
  }

  if (patient === null) {
    return (
      <WorkspaceNotice title="No demo patient for this account">
        <p>
          Records belong to the signed-in user. Create a synthetic demo patient owned by this
          account.
        </p>
        <button
          type="button"
          disabled={creating}
          onClick={async () => {
            setCreating(true);
            try {
              await ensureMyDemoPatient({});
            } finally {
              setCreating(false);
            }
          }}
          className="mt-3 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {creating ? "Creating…" : "Create my demo patient"}
        </button>
      </WorkspaceNotice>
    );
  }

  if (measurements === undefined) {
    return (
      <WorkspaceNotice title="Loading measurements…">
        Reading the patient index.
      </WorkspaceNotice>
    );
  }

  if (measurements.length === 0) {
    return (
      <div className="space-y-4">
        <RecordSyntheticHeartRate patientId={patient._id} />
        <WorkspaceNotice title="No measurements recorded">
          {patient.name} exists, but no observations are stored for this patient yet.
        </WorkspaceNotice>
        <SyntheticActivityHistory />
      </div>
    );
  }

  // The control and the table are siblings, not parent and child. Nothing is passed between
  // them: the write goes to Convex and the result comes back through the subscription the
  // useQuery above already opened.
  return (
    <div className="space-y-4">
      <RecordSyntheticHeartRate patientId={patient._id} />
      <RecentMeasurements measurements={measurements.map(toMeasurementRow)} />
      <SyntheticActivityHistory />
    </div>
  );
}
