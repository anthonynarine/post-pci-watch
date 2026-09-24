// # Filename: convex/simulator.ts
import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { WEARABLE_SIMULATOR_ACTOR, recordAuditEvent, requireUserActor } from "./audit";
import { requireOwnedPatient } from "./authz";
import { evaluateRulesForReading } from "./eventRules";
import { activityState, simulatorStatus } from "./schema";
import {
  initialVitals,
  nextState,
  pickTargets,
  reportedValues,
  stepVitals,
  type Vitals,
} from "./simulatorModel";

/**
 * The synthetic wearable, driven by Convex's scheduler.
 *
 * `ctx.scheduler.runAfter` stores a job in the deployment's scheduled-function queue as part of
 * the calling mutation's transaction: if the mutation rolls back, the job was never scheduled.
 * When it comes due, Convex runs `tick`, and each tick schedules the next. No browser is
 * involved once a session starts.
 *
 * `tick` is internal, so no client can call it. Browsers reach only `start`, `stop`, and
 * `getForPatient`, each owner-checked.
 */

const TICK_MS = 5_000;

/** Every session ends by itself: 15 minutes is at most 180 ticks, 540 rows. */
const SESSION_MS = 15 * 60_000;

const SIMULATOR_DEVICE_ID = "convex-simulator-v1";

const UNITS: Record<keyof Vitals, string> = {
  heartRate: "bpm",
  spo2: "%",
  respiratoryRate: "breaths/min",
};

async function findSimulator(
  ctx: MutationCtx,
  patientId: Id<"patients">,
): Promise<Doc<"simulators"> | null> {
  return await ctx.db
    .query("simulators")
    .withIndex("by_patientId", (q) => q.eq("patientId", patientId))
    .unique();
}

/** The status the dashboard needs, and nothing it does not. */
export const getForPatient = query({
  args: { patientId: v.id("patients") },
  returns: v.union(
    v.null(),
    v.object({
      status: simulatorStatus,
      activityState,
      startedAt: v.number(),
      stopsAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await requireOwnedPatient(ctx, args.patientId);

    const simulator = await ctx.db
      .query("simulators")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .unique();

    if (simulator === null) return null;

    const { status, activityState, startedAt, stopsAt } = simulator;
    return { status, activityState, startedAt, stopsAt };
  },
});

export const start = mutation({
  args: { patientId: v.id("patients") },
  returns: v.object({ started: v.boolean() }),
  handler: async (ctx, args) => {
    const actor = await requireUserActor(ctx);
    const patient = await requireOwnedPatient(ctx, args.patientId);

    if (patient.isSynthetic !== true) {
      throw new Error("Refusing to simulate data for a non-synthetic patient");
    }

    const existing = await findSimulator(ctx, args.patientId);

    // One loop per patient. A second start while running would otherwise schedule a second,
    // parallel chain of ticks and double the stream.
    if (existing?.status === "running") {
      return { started: false };
    }

    const now = Date.now();
    const { state, vitals } = initialVitals(Math.random);

    const session = {
      status: "running" as const,
      activityState: state,
      ticksInState: 0,
      vitals,
      targets: vitals,
      startedAt: now,
      stopsAt: now + SESSION_MS,
    };

    let simulatorId: Id<"simulators">;
    if (existing === null) {
      simulatorId = await ctx.db.insert("simulators", {
        ...session,
        patientId: args.patientId,
        isSynthetic: true,
      });
    } else {
      simulatorId = existing._id;
      await ctx.db.patch("simulators", simulatorId, session);
    }

    // First tick immediately, so a reading appears as soon as the session starts.
    const nextTickId = await ctx.scheduler.runAfter(0, internal.simulator.tick, { simulatorId });
    await ctx.db.patch("simulators", simulatorId, { nextTickId });

    await recordAuditEvent(
      ctx,
      actor,
      { eventType: "simulator.started", patientId: args.patientId, simulatorId },
      now,
    );

    return { started: true };
  },
});

export const stop = mutation({
  args: { patientId: v.id("patients") },
  returns: v.object({ stopped: v.boolean() }),
  handler: async (ctx, args) => {
    const actor = await requireUserActor(ctx);
    await requireOwnedPatient(ctx, args.patientId);

    const simulator = await findSimulator(ctx, args.patientId);
    if (simulator === null || simulator.status === "stopped") {
      return { stopped: false };
    }

    // A tick that is already running writes this same document, so Convex serializes the two:
    // either the tick commits first and this cancels the tick it scheduled, or this commits
    // first and the tick, retried, finds the session stopped. No chain survives a stop.
    if (simulator.nextTickId !== undefined) {
      await ctx.scheduler.cancel(simulator.nextTickId);
    }

    await ctx.db.patch("simulators", simulator._id, {
      status: "stopped",
      nextTickId: undefined,
    });

    await recordAuditEvent(
      ctx,
      actor,
      { eventType: "simulator.stopped", patientId: args.patientId, simulatorId: simulator._id },
      Date.now(),
    );

    return { stopped: true };
  },
});

/** Ends a session from inside a tick, attributed to the simulator — no person stopped it. */
async function stopAsSystem(ctx: MutationCtx, simulator: Doc<"simulators">, now: number) {
  await ctx.db.patch("simulators", simulator._id, { status: "stopped", nextTickId: undefined });

  await recordAuditEvent(
    ctx,
    WEARABLE_SIMULATOR_ACTOR,
    { eventType: "simulator.stopped", patientId: simulator.patientId, simulatorId: simulator._id },
    now,
  );
}

export const tick = internalMutation({
  args: { simulatorId: v.id("simulators") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const simulator = await ctx.db.get("simulators", args.simulatorId);

    // Stopped between scheduling and running: this tick simply does not continue the chain.
    if (simulator === null || simulator.status !== "running") return null;

    const now = Date.now();

    // Step 1: the session's own bounds. A scheduled function runs with no user identity, so
    // these checks replace the ownership check a public function would make.
    if (now >= simulator.stopsAt) {
      await stopAsSystem(ctx, simulator, now);
      return null;
    }

    const patient = await ctx.db.get("patients", simulator.patientId);
    if (patient === null || patient.isSynthetic !== true) {
      await stopAsSystem(ctx, simulator, now);
      return null;
    }

    // Step 2: advance the model.
    const state = nextState(simulator.activityState, simulator.ticksInState, Math.random);
    const changed = state !== simulator.activityState;
    const targets = changed ? pickTargets(state, Math.random) : simulator.targets;
    const vitals = stepVitals(simulator.vitals, targets, Math.random);
    const reported = reportedValues(vitals);

    // Step 3: write what a device would report. observedAt and ingestedAt are the same
    // instant: this producer observes and records in one step, and claiming a transport delay
    // would be fabricated provenance.
    for (const measurementType of ["heartRate", "spo2", "respiratoryRate"] as const) {
      const reading = {
        patientId: simulator.patientId,
        measurementType,
        value: reported[measurementType],
        observedAt: now,
      };

      await ctx.db.insert("measurements", {
        ...reading,
        unit: UNITS[measurementType],
        ingestedAt: now,
        sourceDeviceId: SIMULATOR_DEVICE_ID,
        sourceType: "simulatedWearable",
        origin: "systemProducer",
        isSynthetic: true,
      });

      // Same transaction: the reading and any event it opens, extends, or closes commit
      // together.
      await evaluateRulesForReading(ctx, reading);
    }

    // Step 4: continue the chain. Scheduled inside this transaction, so it exists only if
    // these rows committed.
    const nextTickId = await ctx.scheduler.runAfter(TICK_MS, internal.simulator.tick, {
      simulatorId: simulator._id,
    });

    await ctx.db.patch("simulators", simulator._id, {
      activityState: state,
      ticksInState: changed ? 0 : simulator.ticksInState + 1,
      vitals,
      targets,
      nextTickId,
    });

    return null;
  },
});
