// # Filename: src/features/monitoring/components/SimulatorControl.tsx
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Activity, Play, Square } from "lucide-react";

import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";

/**
 * Starts and stops the server-side synthetic wearable. The simulator itself runs on Convex's
 * scheduler: closing this tab does not stop it, and opening a second tab does not start a
 * second one. This component only asks for a session and shows its status.
 */

const STATE_LABELS: Record<Doc<"simulators">["activityState"], string> = {
  SLEEPING: "Sleeping",
  RESTING: "Resting",
  WALKING: "Walking",
  RECOVERY: "Recovering",
};

function formatTime(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(11, 19);
}

export function SimulatorControl({ patientId }: { patientId: Id<"patients"> }) {
  const simulator = useQuery(api.simulator.getForPatient, { patientId });
  const start = useMutation(api.simulator.start);
  const stop = useMutation(api.simulator.stop);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const running = simulator?.status === "running";

  async function handleClick() {
    if (pending) return;

    setPending(true);
    setError(null);

    try {
      // The button's label comes from the subscription, not from this call's result, so the
      // status shown is always what the server holds.
      if (running) await stop({ patientId });
      else await start({ patientId });
    } catch {
      setError("Could not change the simulator. Check the connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-border bg-surface-raised p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Activity aria-hidden="true" className="size-4 text-primary" />
            Synthetic wearable simulator
          </p>
          <p className="mt-1 text-xs text-foreground-muted">
            Produces heart rate, SpO₂, and respiratory rate every 5 seconds from simple activity
            states. A software test model, not a physiological one. Each session stops itself
            after 15 minutes.
          </p>

          {running ? (
            <p className="mt-2 text-xs text-foreground" aria-live="polite">
              <span className="font-medium">Running</span> · activity:{" "}
              <span className="font-medium">{STATE_LABELS[simulator.activityState]}</span> ·
              stops at <span className="font-mono">{formatTime(simulator.stopsAt)}</span> UTC
            </p>
          ) : (
            <p className="mt-2 text-xs text-foreground-muted" aria-live="polite">
              {simulator === undefined ? "Checking status…" : "Stopped"}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleClick}
          disabled={pending || simulator === undefined}
          aria-busy={pending}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {running ? (
            <Square aria-hidden="true" className="size-3.5" />
          ) : (
            <Play aria-hidden="true" className="size-3.5" />
          )}
          {running ? "Stop simulator" : "Start simulator"}
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-xs font-medium text-status-critical">
          {error}
        </p>
      ) : null}
    </div>
  );
}
