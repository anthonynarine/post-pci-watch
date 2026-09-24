// # Filename: src/features/monitoring/hooks/useNow.ts
"use client";

import { useEffect, useState } from "react";

/**
 * The current time, floored to `stepMs` and advanced once per step. `null` until mounted.
 *
 * Convex queries may not read the clock, so anything time-relative — "the last 5 minutes",
 * "is this reading current?" — is decided here and passed in. Flooring matters: a value that
 * changed every render would give the query new arguments every render and resubscribe
 * constantly. This is a clock, not polling: nothing is fetched when it ticks; at most a
 * query's `since` argument moves forward.
 *
 * Starting at null keeps the server render and the first client render identical, since the
 * two would otherwise read different clocks.
 */
export function useNow(stepMs: number): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const read = () => setNow(Math.floor(Date.now() / stepMs) * stepMs);

    read();
    const timer = setInterval(read, stepMs);
    return () => clearInterval(timer);
  }, [stepMs]);

  return now;
}
