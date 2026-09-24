// # Filename: src/features/monitoring/components/LiveConnectionLost.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { PlugZap, WifiOff } from "lucide-react";

import { useConvexConnectionRecovery } from "@/components/convex/ConvexClientProvider";

/**
 * The S-20 failure state, shown when Clerk still reports a live session but Convex holds no
 * verified token. It replaces the measurement table rather than sitting beside it: a
 * disconnected monitoring surface must not leave readings on screen that a reader could
 * mistake for current ones.
 *
 * Fail-closed by construction — the synthetic write control is not rendered in this state,
 * and every protected Convex function would reject the call anyway.
 */

/**
 * A failed re-attempt produces no state change (`isConvexAuthenticated` is already false),
 * so React never re-renders to tell us it finished. Success is visible — this whole
 * component unmounts. This bound only stops the button reading "Reconnecting…" forever
 * after a failure; it does not schedule, repeat, or hide anything.
 */
const ATTEMPT_FEEDBACK_MS = 4000;

export function LiveConnectionLost() {
  const { browserReportsOffline, reconnect } = useConvexConnectionRecovery();
  const [attempting, setAttempting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleReconnect() {
    if (attempting) return;

    setAttempting(true);
    reconnect();

    timerRef.current = setTimeout(() => setAttempting(false), ATTEMPT_FEEDBACK_MS);
  }

  return (
    <section
      role="alert"
      className="rounded-xl border border-status-critical-line bg-status-critical-soft p-5"
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-status-critical">
        <WifiOff aria-hidden="true" className="size-4" />
        Live monitoring disconnected
      </h2>

      <p className="mt-2 text-xs text-foreground-muted">
        You are still signed in, but this page does not hold a verified Convex token, so its
        subscriptions are closed. <strong className="font-medium text-foreground">No
        readings are being received.</strong> Any values you saw before this point are
        historical and must not be read as current.
      </p>

      {browserReportsOffline ? (
        <p className="mt-2 text-xs text-foreground-muted">
          This browser reports itself offline. Clerk refuses to request a token while that
          flag is set, so reconnecting cannot succeed until the browser reports itself online
          again — even if the network is in fact working.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleReconnect}
          disabled={attempting}
          aria-busy={attempting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <PlugZap aria-hidden="true" className="size-3.5" />
          {attempting ? "Reconnecting…" : "Reconnect"}
        </button>

        <p className="text-xs text-foreground-muted">
          If reconnecting does not restore the feed, reload the page.
        </p>
      </div>
    </section>
  );
}
