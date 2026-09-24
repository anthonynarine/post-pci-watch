// # Filename: convex/measurements.ts
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { recordAuditEvent, requireUserActor } from "./audit";
import { requireOwnedPatient } from "./authz";
import schema from "./schema";

/** Hard ceiling on how much one call may read, regardless of what the caller asks for. */
const MAX_LIMIT = 100;

export const listRecentForPatient = query({
  args: {
    patientId: v.id("patients"),
    limit: v.number(),
  },
  returns: v.array(schema.doc("measurements")),
  handler: async (ctx, args) => {
    // Ownership is checked BEFORE any measurement is read, and it is proven through the
    // parent patient rather than stored again on every row. `patientId` arriving from the
    // browser is fine precisely because of this line: the caller names a record, and the
    // server decides whether that record is theirs.
    //
    // This throws for a patient that does not exist and for one owned by someone else, so
    // a caller probing IDs learns nothing from the difference.
    await requireOwnedPatient(ctx, args.patientId);

    const limit = Math.max(1, Math.min(Math.floor(args.limit), MAX_LIMIT));

    return await ctx.db
      .query("measurements")
      .withIndex("by_patientId_and_observedAt", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .take(limit);
  },
});

/**
 * Bounds for a synthetic heart-rate value, in bpm.
 *
 * Not a clinical reference range and not a safety threshold. It is the envelope of values a
 * wearable could plausibly report at all — a defensible sanity bound on synthetic input,
 * nothing more. Deciding whether a value is clinically meaningful is Phase 10's deterministic
 * rules, and it is not this mutation's business.
 */
const MIN_SYNTHETIC_BPM = 30;
const MAX_SYNTHETIC_BPM = 200;

/** Provenance for rows this control creates. Set by the server, never by the caller. */
const MANUAL_SOURCE_DEVICE_ID = "manual-phase5-control";

/**
 * Records one synthetic heart-rate reading for a patient the caller owns.
 *
 * Phase 5 exists to make the Convex subscription visible: this is the write whose effect
 * every subscribed client sees without asking for it. It is a manual developer control, not
 * a wearable and not a simulator — Phase 6 builds the producer.
 *
 * The caller supplies two things: which patient, and what value. It supplies nothing about
 * who it is, what kind of measurement this is, where the reading came from, or whether the
 * record is synthetic. All of that is decided here.
 */
export const recordSyntheticHeartRate = mutation({
  args: {
    patientId: v.id("patients"),
    value: v.number(),
  },
  returns: v.object({
    measurementId: v.id("measurements"),
    value: v.number(),
    observedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    // Step 1: authenticate, then authorize, before anything is written. The actor comes from
    // the verified token; ownership throws identically for a missing patient and someone
    // else's.
    const actor = await requireUserActor(ctx);
    const patient = await requireOwnedPatient(ctx, args.patientId);

    // Step 2: refuse to attach synthetic readings to a record that does not declare itself
    // synthetic. The schema's v.literal(true) makes this unreachable today — which is the
    // point of writing it now, while it is free. If the schema ever widens, this mutation
    // already refuses rather than silently becoming the path that writes fabricated data
    // onto a real record.
    if (patient.isSynthetic !== true) {
      throw new Error("Refusing to write a synthetic measurement to a non-synthetic patient");
    }

    // Step 3: the value is the only number the client controls, so it is the only number
    // that needs bounding. A validator proves it is a number; it does not prove it is a
    // heart rate.
    if (!Number.isFinite(args.value)) {
      throw new Error("Heart rate must be a finite number");
    }

    if (args.value < MIN_SYNTHETIC_BPM || args.value > MAX_SYNTHETIC_BPM) {
      throw new Error(
        `Heart rate must be between ${MIN_SYNTHETIC_BPM} and ${MAX_SYNTHETIC_BPM} bpm`,
      );
    }

    // Step 4: one clock read, two fields. A mutation may read the wall clock; a query may
    // not, because queries do not rerun merely because time advanced.
    //
    // observedAt and ingestedAt hold the same instant here, and they stay separate fields
    // anyway. This control observes and records in the same breath, so claiming a transport
    // delay would be fabricating provenance. A real producer will set them apart, and the
    // shape that records the difference has to exist before there is a difference to record.
    const now = Date.now();

    const measurementId = await ctx.db.insert("measurements", {
      patientId: args.patientId,
      measurementType: "heartRate",
      value: args.value,
      unit: "bpm",
      observedAt: now,
      ingestedAt: now,
      sourceDeviceId: MANUAL_SOURCE_DEVICE_ID,
      sourceType: "manualEntry",
      origin: "userManualControl",
      isSynthetic: true,
    });

    // Step 5: the audit event, in the same transaction. Every check above has already passed
    // or thrown, so a rejected call leaves neither this row nor the measurement behind.
    await recordAuditEvent(
      ctx,
      actor,
      { eventType: "measurement.recorded", patientId: args.patientId, measurementId },
      now,
    );

    return { measurementId, value: args.value, observedAt: now };
  },
});
