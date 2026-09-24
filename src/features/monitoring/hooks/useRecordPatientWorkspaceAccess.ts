// # Filename: src/features/monitoring/hooks/useRecordPatientWorkspaceAccess.ts
"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Records one `patientWorkspace.accessed` event per mounted workspace.
 *
 * This is a legitimate use of `useEffect`: it reports something that happened — a person
 * opened this workspace — to a system outside React. It does not fetch data; the measurements
 * still arrive only through their subscription.
 *
 * The correlation ID is generated once per mount and held in a ref, so every send from this
 * mount carries the same one. That matters because the effect can run more than once:
 * React Strict Mode runs it twice in development, and the patient ID drops to undefined and
 * returns across a reconnect. Each repeat is deduplicated by the server on
 * actor + event type + patient + correlation ID — the client's guard is a courtesy, the
 * server's is the guarantee.
 */
export function useRecordPatientWorkspaceAccess(patientId: Id<"patients"> | undefined) {
  const recordAccess = useMutation(api.audit.recordPatientWorkspaceAccess);
  const correlationIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (patientId === undefined) return;

    correlationIdRef.current ??= crypto.randomUUID();

    recordAccess({ patientId, correlationId: correlationIdRef.current }).catch(() => {
      // Recording is best-effort evidence, not a gate on viewing. A failure here — most
      // likely a lost token — is retried by the next run of this effect after reconnecting,
      // with the same correlation ID.
    });
  }, [patientId, recordAccess]);
}
