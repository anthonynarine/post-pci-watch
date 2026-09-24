// # Filename: src/features/monitoring/components/RecordSyntheticHeartRate.tsx
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { FlaskConical, HeartPulse } from "lucide-react";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Phase 5 demonstration control. A Client Component because it owns a click handler and
 * transient UI state — nothing more.
 *
 * What it deliberately does NOT do: read the measurement list, hold a copy of it, append the
 * new row to it, or tell anything to refresh. The write goes to Convex; the already-open
 * subscription in MonitoringDataWorkspace delivers the result. If this component were
 * deleted after a click, the new row would still appear.
 */

/** A plausible resting band for a post-PCI patient at rest. Picked per click so repeated
 *  presses produce visibly different values; the server bounds what it will accept. */
const DEMO_MIN_BPM = 62;
const DEMO_MAX_BPM = 98;

function nextDemoValue(): number {
  // Called from a click handler, never during render, so this cannot cause a hydration
  // mismatch. Phase 6 replaces guesswork like this with physiologically plausible state
  // transitions; a single unconstrained pick is enough to show one write arriving.
  return DEMO_MIN_BPM + Math.floor(Math.random() * (DEMO_MAX_BPM - DEMO_MIN_BPM + 1));
}

export function RecordSyntheticHeartRate({ patientId }: { patientId: Id<"patients"> }) {
  const recordSyntheticHeartRate = useMutation(api.measurements.recordSyntheticHeartRate);

  // The only local state here is transient UI state. No query result is copied into it.
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    // Guard against a second click landing while the first is in flight. The button is also
    // disabled, but a disabled attribute is a UI affordance, not a concurrency control.
    if (pending) return;

    setPending(true);
    setError(null);

    try {
      await recordSyntheticHeartRate({ patientId, value: nextDemoValue() });
      // Nothing is done with the return value on purpose. The row appears because the
      // subscription delivers it, not because this call resolved.
    } catch {
      // The thrown message is generic by design on the server; showing the raw error text
      // would surface internals to the user for no benefit.
      setError("Could not record the reading. Check the connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-border bg-surface-raised p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <FlaskConical aria-hidden="true" className="size-4 text-primary" />
            Manual entry
          </p>
          <p className="mt-1 text-xs text-foreground-muted">
            Writes one fabricated heart-rate value by hand, separately from the simulator. The
            table below updates through its existing subscription, without a page refresh. The
            value is a made-up number and carries no clinical meaning.
          </p>
        </div>

        <button
          type="button"
          onClick={handleClick}
          disabled={pending}
          aria-busy={pending}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <HeartPulse aria-hidden="true" className="size-3.5" />
          {pending ? "Recording…" : "Record synthetic heart rate"}
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
