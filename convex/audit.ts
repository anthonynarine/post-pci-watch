// # Filename: convex/audit.ts
import { v, type Infer } from "convex/values";

import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireOwnedPatient, requireSubject } from "./authz";
import { auditActorType, auditEventType, auditOutcome, auditResourceType } from "./schema";

/**
 * Who performed an action, as the audit log records it. Only this module constructs one, and
 * only from a verified token — see `requireUserActor`.
 */
type AuditActor = {
  actorType: Infer<typeof auditActorType>;
  actorSubject: string;
};

/**
 * What happened, one shape per event type. Each variant carries only the references that
 * event needs, so a caller cannot attach a value, a name, or free-form metadata: the type has
 * nowhere to put it.
 */
type AuditEventInput =
  | { eventType: "patient.created"; patientId: Id<"patients"> }
  | {
      eventType: "measurement.recorded";
      patientId: Id<"patients">;
      measurementId: Id<"measurements">;
    }
  | {
      eventType: "patientWorkspace.accessed";
      patientId: Id<"patients">;
      correlationId: string;
    }
  | {
      eventType: "simulator.started" | "simulator.stopped";
      patientId: Id<"patients">;
      simulatorId: Id<"simulators">;
    };

/**
 * The acting user, derived from the verified token. There is deliberately no argument through
 * which a caller could supply or influence it.
 */
export async function requireUserActor(ctx: QueryCtx | MutationCtx): Promise<AuditActor> {
  return { actorType: "user", actorSubject: await requireSubject(ctx) };
}

/**
 * The simulator, as an actor. A program has no Clerk session, so it is named by a fixed
 * server-side constant and never by a `user_…` subject: an event it causes must not read as
 * something a person did.
 */
export const WEARABLE_SIMULATOR_ACTOR: AuditActor = {
  actorType: "system",
  actorSubject: "system:wearable-simulator",
};

// crypto.randomUUID() output. Anything else — longer strings, embedded content — is refused.
const CORRELATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function requireValidCorrelationId(correlationId: string): string {
  if (!CORRELATION_ID_PATTERN.test(correlationId)) {
    throw new Error("Invalid correlation ID");
  }

  return correlationId;
}

/**
 * Inserts one audit event. Call it inside the same mutation as the write it describes: both
 * then commit together or neither does.
 *
 * `occurredAt` is passed in rather than read here so an event and the row it describes can
 * share one clock reading.
 */
export async function recordAuditEvent(
  ctx: MutationCtx,
  actor: AuditActor,
  event: AuditEventInput,
  occurredAt: number,
): Promise<void> {
  const base = {
    ...actor,
    eventType: event.eventType,
    patientId: event.patientId,
    occurredAt,
    outcome: "succeeded" as const,
    isSynthetic: true as const,
  };

  switch (event.eventType) {
    case "patient.created":
      await ctx.db.insert("auditEvents", {
        ...base,
        resourceType: "patient",
        resourceId: event.patientId,
      });
      return;

    case "measurement.recorded":
      await ctx.db.insert("auditEvents", {
        ...base,
        resourceType: "measurement",
        resourceId: event.measurementId,
      });
      return;

    case "patientWorkspace.accessed":
      await ctx.db.insert("auditEvents", {
        ...base,
        resourceType: "patient",
        resourceId: event.patientId,
        correlationId: event.correlationId,
      });
      return;

    case "simulator.started":
    case "simulator.stopped":
      await ctx.db.insert("auditEvents", {
        ...base,
        resourceType: "simulator",
        resourceId: event.simulatorId,
      });
      return;
  }
}

/**
 * Records that the signed-in user opened a patient's workspace — once per workspace session.
 *
 * Client-declared evidence, not enforcement. The browser decides to call this; a modified
 * client could read through the query without calling it. What the server does guarantee is
 * that the event, if written, names the real actor and a patient that actor owns.
 */
export const recordPatientWorkspaceAccess = mutation({
  args: {
    patientId: v.id("patients"),
    correlationId: v.string(),
  },
  returns: v.object({ recorded: v.boolean() }),
  handler: async (ctx, args) => {
    // Step 1: identity from the token; ownership before anything is read or written.
    const actor = await requireUserActor(ctx);
    await requireOwnedPatient(ctx, args.patientId);
    const correlationId = requireValidCorrelationId(args.correlationId);

    // Step 2: idempotency. React may run the calling effect twice, and a reconnect may send it
    // again. Two concurrent calls with the same key both read this index range; Convex's
    // serializable transactions make the second one retry, see the first one's row, and stop.
    const existing = await ctx.db
      .query("auditEvents")
      .withIndex("by_actorSubject_and_eventType_and_patientId_and_correlationId", (q) =>
        q
          .eq("actorSubject", actor.actorSubject)
          .eq("eventType", "patientWorkspace.accessed")
          .eq("patientId", args.patientId)
          .eq("correlationId", correlationId),
      )
      .first();

    if (existing !== null) {
      return { recorded: false };
    }

    await recordAuditEvent(
      ctx,
      actor,
      { eventType: "patientWorkspace.accessed", patientId: args.patientId, correlationId },
      Date.now(),
    );

    return { recorded: true };
  },
});

const MAX_ACTIVITY_LIMIT = 50;

/**
 * The caller's own recent activity, newest first. A minimum-necessary projection: no actor
 * identifier, no document IDs, no patient reference — the caller already knows who they are,
 * and the panel has no use for the rest.
 *
 * A reactive query like any other: a new event reruns it. Reruns are not logged, because a
 * rerun is the transport noticing a write, not a person looking at something.
 */
export const listMyRecentEvents = query({
  args: { limit: v.number() },
  returns: v.array(
    v.object({
      eventType: auditEventType,
      resourceType: auditResourceType,
      occurredAt: v.number(),
      outcome: auditOutcome,
    }),
  ),
  handler: async (ctx, args) => {
    const actor = await requireUserActor(ctx);

    if (!Number.isFinite(args.limit)) {
      throw new Error("Limit must be a finite number");
    }

    const limit = Math.max(1, Math.min(Math.floor(args.limit), MAX_ACTIVITY_LIMIT));

    const events = await ctx.db
      .query("auditEvents")
      .withIndex("by_actorSubject_and_occurredAt", (q) =>
        q.eq("actorSubject", actor.actorSubject),
      )
      .order("desc")
      .take(limit);

    return events.map(({ eventType, resourceType, occurredAt, outcome }) => ({
      eventType,
      resourceType,
      occurredAt,
      outcome,
    }));
  },
});
