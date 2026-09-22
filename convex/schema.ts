// # Filename: convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Measurement kinds this phase stores. A union of literals, not v.string(): the set is
 * fixed, so an unknown kind should be rejected at the boundary rather than discovered later
 * in a chart that renders nothing.
 *
 * Only numeric observations live here. Blood pressure (118/74) and activity state
 * ("RESTING") are not single numbers and stay hardcoded on the dashboard until a later
 * phase decides how to model them.
 */
export const measurementType = v.union(
  v.literal("heartRate"),
  v.literal("spo2"),
  v.literal("respiratoryRate"),
  v.literal("skinTemperature"),
);

/** Where an observation came from. Provenance, not decoration. */
export const sourceType = v.union(
  v.literal("simulatedWearable"),
  v.literal("manualEntry"),
);

export const monitoringStatus = v.union(
  v.literal("active"),
  v.literal("paused"),
  v.literal("ended"),
);

export default defineSchema({
  patients: defineTable({
    /**
     * The Clerk `subject` claim of the user who owns this record, taken from a token that
     * Convex verified. Never from a function argument.
     *
     * Required, reached in three deploys rather than one. Adding a required field to a
     * populated table fails the push outright, so: stage 1 added it as optional, stage 2
     * (`migrations:deleteUnownedPatients`) removed the Phase 3 rows that lacked it, and
     * stage 3 tightened it to this. The deploy that tightens it also proves no unowned row
     * survived — Convex validates the whole table before accepting the schema.
     */
    ownerSubject: v.string(),
    // Stable key so the seed can find an existing demo patient instead of creating a
    // second one. Convex _id values are generated per insert and cannot serve this purpose.
    demoKey: v.string(),
    name: v.string(),
    age: v.number(),
    procedure: v.string(),
    procedureCompletedAt: v.number(),
    monitoringStatus,
    // Stored, not inferred. A record that claims to be synthetic in the database cannot be
    // mistaken for a real one by code that never saw the seed.
    isSynthetic: v.literal(true),
  })
    // The ownership index. Owner first: every read starts by narrowing to one user's
    // records, which is exactly the shape every authorized query needs.
    .index("by_ownerSubject_and_demoKey", ["ownerSubject", "demoKey"]),

  measurements: defineTable({
    patientId: v.id("patients"),
    measurementType,
    value: v.number(),
    unit: v.string(),
    // When the device says the observation happened.
    observedAt: v.number(),
    // When this system received it. Kept separate on purpose: the gap is the signal.
    ingestedAt: v.number(),
    sourceDeviceId: v.string(),
    sourceType,
    isSynthetic: v.literal(true),
  })
    // Field order is the query order. patientId first narrows to one patient, observedAt
    // second orders within that patient, so "this patient's most recent N" is an index
    // range read rather than a scan of every measurement ever stored.
    .index("by_patientId_and_observedAt", ["patientId", "observedAt"]),
});
