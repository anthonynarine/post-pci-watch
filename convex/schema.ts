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

/**
 * What kind of source produced an observation. Provenance, not decoration.
 *
 * `seedFixture` exists because the demo fixtures were originally labelled
 * `simulatedWearable`, and no simulator has ever run. A label that claims a device which never
 * existed is fabricated provenance, so the fixtures now say what they are.
 */
export const sourceType = v.union(
  v.literal("simulatedWearable"),
  v.literal("manualEntry"),
  v.literal("seedFixture"),
);

/**
 * How a row entered the system — a different question from `sourceType`, which describes the
 * device. Set only by server code, never accepted from a caller.
 *
 * `systemProducer` is reserved for the Phase 6 simulator. A program has no Clerk session, so
 * its rows must never be attributed to a person.
 */
export const measurementOrigin = v.union(
  v.literal("seedFixture"),
  v.literal("userManualControl"),
  v.literal("systemProducer"),
);

/**
 * Audit vocabulary. Literal unions, not strings: an event type the schema does not name
 * cannot be written, so the log cannot quietly accumulate categories nobody designed.
 */
export const auditActorType = v.union(v.literal("user"), v.literal("system"));

export const auditEventType = v.union(
  v.literal("patient.created"),
  v.literal("measurement.recorded"),
  v.literal("patientWorkspace.accessed"),
  v.literal("simulator.started"),
  v.literal("simulator.stopped"),
);

export const auditResourceType = v.union(
  v.literal("patient"),
  v.literal("measurement"),
  v.literal("simulator"),
);

/**
 * Only one value, deliberately. A mutation that throws rolls back every write in it, so a
 * denial cannot commit an audit row. Recording "denied" here would claim evidence this
 * design cannot produce.
 */
export const auditOutcome = v.literal("succeeded");

/** The simulated wearer's activity. Drives which value ranges the simulator draws toward. */
export const activityState = v.union(
  v.literal("SLEEPING"),
  v.literal("RESTING"),
  v.literal("WALKING"),
  v.literal("RECOVERY"),
);

export const simulatorStatus = v.union(v.literal("running"), v.literal("stopped"));

/** Rule identifiers. Definitions live in convex/eventRules.ts; the schema only names them. */
export const eventRuleId = v.union(
  v.literal("heartRateAboveThreshold"),
  v.literal("spo2BelowThresholdSustained"),
);

export const monitoringEventStatus = v.union(v.literal("open"), v.literal("closed"));

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
    // Required, reached in three deploys as `ownerSubject` was: added optional, backfilled
    // from exact known source identifiers (36 seed fixtures, 29 manual rows, 0 unknown),
    // then tightened here. Convex validated all 65 rows before accepting this schema.
    origin: measurementOrigin,
    isSynthetic: v.literal(true),
  })
    // Field order is the query order. patientId first narrows to one patient, observedAt
    // second orders within that patient, so "this patient's most recent N" is an index
    // range read rather than a scan of every measurement ever stored.
    .index("by_patientId_and_observedAt", ["patientId", "observedAt"])
    // Per-vital reads: "latest heart rate" is one descending lookup, and a time window is a
    // bounded range per vital instead of one range holding every vital interleaved.
    .index("by_patientId_and_measurementType_and_observedAt", [
      "patientId",
      "measurementType",
      "observedAt",
    ]),

  /**
   * Deterministic rule episodes, derived from measurements in the same transaction that wrote
   * them. One row per continuous run of qualifying readings. Derived data, never a substitute
   * for the measurements it was computed from.
   */
  monitoringEvents: defineTable({
    patientId: v.id("patients"),
    ruleId: eventRuleId,
    // Which rule definitions produced this row, so a later threshold change cannot silently
    // reinterpret old events.
    rulesVersion: v.string(),
    status: monitoringEventStatus,
    // observedAt of the first and latest qualifying readings; endedAt is the reading that
    // broke the condition.
    startedAt: v.number(),
    lastObservedAt: v.number(),
    endedAt: v.optional(v.number()),
    readingCount: v.number(),
    // Highest value for an "above" rule, lowest for a "below" rule.
    extremeValue: v.number(),
    isSynthetic: v.literal(true),
  })
    // Evaluator: "is there an open episode of this rule for this patient?"
    .index("by_patientId_and_ruleId_and_status", ["patientId", "ruleId", "status"])
    // Dashboard: this patient's episodes, newest first.
    .index("by_patientId_and_startedAt", ["patientId", "startedAt"]),

  /**
   * One simulated wearable per patient. Kept apart from `patients` because it changes every
   * tick; putting it on the patient would make every tick rewrite the patient record and rerun
   * every query that reads it.
   *
   * `vitals` and `targets` keep full precision so drift stays smooth; measurements store the
   * rounded values a device would report.
   */
  simulators: defineTable({
    patientId: v.id("patients"),
    status: simulatorStatus,
    activityState,
    ticksInState: v.number(),
    vitals: v.object({ heartRate: v.number(), spo2: v.number(), respiratoryRate: v.number() }),
    targets: v.object({ heartRate: v.number(), spo2: v.number(), respiratoryRate: v.number() }),
    startedAt: v.number(),
    // Hard stop for the session, set at start. Bounds how many rows one session can write.
    stopsAt: v.number(),
    // The pending tick, so stop can cancel it. Absent when stopped.
    nextTickId: v.optional(v.id("_scheduled_functions")),
    isSynthetic: v.literal(true),
  }).index("by_patientId", ["patientId"]),

  /**
   * Append-only evidence of successful actions. Written only through `recordAuditEvent` in
   * convex/audit.ts, and no function anywhere updates or deletes a row.
   *
   * References, never content: no measurement value, patient name, email, token, payload,
   * or free-form metadata. Every field is either server-derived or a validated grouping key.
   */
  auditEvents: defineTable({
    actorType: auditActorType,
    // The verified Clerk `subject` for a user; a fixed `system:` constant for a program.
    // Never a function argument.
    actorSubject: v.string(),
    eventType: auditEventType,
    resourceType: auditResourceType,
    resourceId: v.optional(v.union(v.id("patients"), v.id("measurements"), v.id("simulators"))),
    patientId: v.optional(v.id("patients")),
    occurredAt: v.number(),
    // Browser-generated, validated as a UUID. Groups events; grants nothing.
    correlationId: v.optional(v.string()),
    outcome: auditOutcome,
    isSynthetic: v.literal(true),
  })
    // The activity-history read: actor first scopes the range to one account, time second
    // makes "newest N" a descending range read instead of a sort.
    .index("by_actorSubject_and_occurredAt", ["actorSubject", "occurredAt"])
    // The idempotency lookup for workspace access, in the order the equality checks narrow
    // it. Actor first, so one account's correlation IDs can never match another's.
    .index("by_actorSubject_and_eventType_and_patientId_and_correlationId", [
      "actorSubject",
      "eventType",
      "patientId",
      "correlationId",
    ]),
});
