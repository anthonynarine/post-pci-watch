// # Filename: src/features/monitoring/components/SyntheticActivityHistory.tsx
"use client";

import { useQuery } from "convex/react";
import { History } from "lucide-react";

import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { Card } from "@/components/ui/Card";

/**
 * The signed-in user's own recent activity, from the append-only `auditEvents` table.
 *
 * Deliberately not called an audit log: it is one account's view of its own synthetic
 * activity, with no roles, retention, or tamper evidence behind it. No identifiers are
 * shown — the server does not send any.
 *
 * Rendered only inside MonitoringDataWorkspace's authenticated branch, so the subscription
 * opens only once Convex holds a verified token.
 */

const ACTIVITY_LIMIT = 10;

const EVENT_LABELS: Record<Doc<"auditEvents">["eventType"], string> = {
  "patient.created": "Created synthetic demo patient",
  "measurement.recorded": "Recorded synthetic heart rate",
  "patientWorkspace.accessed": "Opened patient workspace",
  "simulator.started": "Started synthetic wearable simulator",
  "simulator.stopped": "Stopped synthetic wearable simulator",
};

// Same fixed UTC layout as the measurements table, for the same reason: a locale-formatted
// string would differ between machines.
function formatTimestamp(epochMs: number): string {
  return new Date(epochMs).toISOString().replace("T", " ").slice(0, 19);
}

export function SyntheticActivityHistory() {
  const events = useQuery(api.audit.listMyRecentEvents, { limit: ACTIVITY_LIMIT });

  return (
    <Card
      title="Synthetic activity history"
      description="Your own recent actions on synthetic records in this demo. Not a HIPAA audit log."
      icon={History}
    >
      {events === undefined ? (
        <p className="text-xs text-foreground-muted">Loading activity…</p>
      ) : events.length === 0 ? (
        <p className="text-xs text-foreground-muted">No activity recorded yet.</p>
      ) : (
        <ol className="divide-y divide-border">
          {events.map((event) => (
            // No document ID is sent to the browser, so the key is built from the event itself.
            // Not position: new events arrive at the top, which would shift every index.
            <li
              key={`${event.eventType}-${event.occurredAt}`}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2"
            >
              <span className="text-sm text-foreground">{EVENT_LABELS[event.eventType]}</span>
              <span className="font-mono text-xs text-foreground-muted">
                {formatTimestamp(event.occurredAt)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
