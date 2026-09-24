// # Filename: convex/monitoringEvents.ts
import { v } from "convex/values";

import { query } from "./_generated/server";
import { requireOwnedPatient } from "./authz";
import { ruleById } from "./eventRules";
import { eventRuleId, monitoringEventStatus } from "./schema";

const MAX_EVENTS = 20;

/**
 * A patient's rule episodes, newest first, with each rule's stated definition attached so the
 * dashboard shows exactly which comparison produced an event.
 */
export const listForPatient = query({
  args: { patientId: v.id("patients"), limit: v.number() },
  returns: v.array(
    v.object({
      ruleId: eventRuleId,
      title: v.string(),
      ruleDescription: v.string(),
      rulesVersion: v.string(),
      status: monitoringEventStatus,
      startedAt: v.number(),
      lastObservedAt: v.number(),
      endedAt: v.optional(v.number()),
      readingCount: v.number(),
      extremeValue: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await requireOwnedPatient(ctx, args.patientId);

    if (!Number.isFinite(args.limit)) {
      throw new Error("Limit must be a finite number");
    }

    const limit = Math.max(1, Math.min(Math.floor(args.limit), MAX_EVENTS));

    const events = await ctx.db
      .query("monitoringEvents")
      .withIndex("by_patientId_and_startedAt", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .take(limit);

    return events.map((event) => {
      const rule = ruleById(event.ruleId);
      return {
        ruleId: event.ruleId,
        title: rule.title,
        ruleDescription: rule.description,
        rulesVersion: event.rulesVersion,
        status: event.status,
        startedAt: event.startedAt,
        lastObservedAt: event.lastObservedAt,
        endedAt: event.endedAt,
        readingCount: event.readingCount,
        extremeValue: event.extremeValue,
      };
    });
  },
});
