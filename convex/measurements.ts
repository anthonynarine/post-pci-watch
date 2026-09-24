// # Filename: convex/measurements.ts
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { recordAuditEvent, requireUserActor } from "./audit";
import { requireOwnedPatient } from "./authz";
import { evaluateRulesForReading } from "./eventRules";
import schema, { measurementOrigin, measurementType } from "./schema";

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

    await evaluateRulesForReading(ctx, {
      patientId: args.patientId,
      measurementType: "heartRate",
      value: args.value,
      observedAt: now,
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

/** The vitals the dashboard shows live. Skin temperature exists only in the seed fixtures. */
const LIVE_VITALS = ["heartRate", "spo2", "respiratoryRate"] as const;

/**
 * The most recent reading of each live vital. One descending index lookup per vital, so the
 * cost does not grow with history.
 *
 * Returns the reading and its time, never a judgement of whether it is current: "current"
 * depends on the clock, and a query may not read the clock. The client decides freshness.
 */
export const getCurrentVitals = query({
  args: { patientId: v.id("patients") },
  returns: v.array(
    v.object({
      measurementType,
      value: v.number(),
      unit: v.string(),
      observedAt: v.number(),
      origin: measurementOrigin,
    }),
  ),
  handler: async (ctx, args) => {
    await requireOwnedPatient(ctx, args.patientId);

    const latest = [];
    for (const type of LIVE_VITALS) {
      const reading = await ctx.db
        .query("measurements")
        .withIndex("by_patientId_and_measurementType_and_observedAt", (q) =>
          q.eq("patientId", args.patientId).eq("measurementType", type),
        )
        .order("desc")
        .first();

      if (reading !== null) {
        const { measurementType, value, unit, observedAt, origin } = reading;
        latest.push({ measurementType, value, unit, observedAt, origin });
      }
    }

    return latest;
  },
});

/** Per-vital ceiling on one window read. An hour of simulator output is 720 per vital. */
const MAX_WINDOW_ROWS_PER_VITAL = 1000;

/**
 * Count, min, mean, max, and latest for each live vital since `since`.
 *
 * `since` comes from the client because a query cannot read the clock — a query that computed
 * "an hour ago" itself would freeze at the moment it first ran, since queries rerun when their
 * data changes, not when time passes. New rows inside the window still arrive reactively.
 *
 * Summaries, not rows: the browser needs six numbers per vital, not 720 documents.
 */
export const summarizeWindow = query({
  args: {
    patientId: v.id("patients"),
    since: v.number(),
  },
  returns: v.object({
    truncated: v.boolean(),
    vitals: v.array(
      v.object({
        measurementType,
        unit: v.string(),
        count: v.number(),
        min: v.number(),
        mean: v.number(),
        max: v.number(),
        latest: v.number(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    await requireOwnedPatient(ctx, args.patientId);

    if (!Number.isFinite(args.since)) {
      throw new Error("Window start must be a finite timestamp");
    }

    let truncated = false;
    const vitals = [];

    for (const type of LIVE_VITALS) {
      // Newest first, so if the ceiling is hit the summary covers the most recent readings.
      const rows = await ctx.db
        .query("measurements")
        .withIndex("by_patientId_and_measurementType_and_observedAt", (q) =>
          q
            .eq("patientId", args.patientId)
            .eq("measurementType", type)
            .gte("observedAt", args.since),
        )
        .order("desc")
        .take(MAX_WINDOW_ROWS_PER_VITAL);

      if (rows.length === MAX_WINDOW_ROWS_PER_VITAL) truncated = true;
      if (rows.length === 0) continue;

      const values = rows.map((row) => row.value);
      const sum = values.reduce((total, value) => total + value, 0);

      vitals.push({
        measurementType: type,
        unit: rows[0].unit,
        count: values.length,
        min: Math.min(...values),
        mean: Math.round((sum / values.length) * 10) / 10,
        max: Math.max(...values),
        latest: rows[0].value,
      });
    }

    return { truncated, vitals };
  },
});
