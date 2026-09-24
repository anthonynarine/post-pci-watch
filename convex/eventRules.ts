// # Filename: convex/eventRules.ts
import type { Infer } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import type { eventRuleId, measurementType } from "./schema";

/**
 * Deterministic monitoring rules. Software events, not clinical conclusions and not model
 * output: each is a fixed comparison over stored readings, stated here in full.
 *
 * The thresholds are demo configuration chosen so the synthetic simulator can exercise them.
 * They are not clinical limits and must not be read as such.
 */

/** Bumped whenever a rule's definition changes, so stored events say which rules made them. */
export const RULES_VERSION = "rules-v1";

type RuleId = Infer<typeof eventRuleId>;

type Rule = {
  id: RuleId;
  measurementType: Infer<typeof measurementType>;
  comparison: "above" | "below";
  threshold: number;
  /** How many consecutive readings must meet the condition before an event opens. */
  consecutive: number;
  title: string;
  description: string;
};

export const EVENT_RULES: readonly Rule[] = [
  {
    id: "heartRateAboveThreshold",
    measurementType: "heartRate",
    comparison: "above",
    threshold: 100,
    consecutive: 3,
    title: "Heart rate above configured threshold",
    description: "Heart rate > 100 bpm for 3 consecutive readings",
  },
  {
    id: "spo2BelowThresholdSustained",
    measurementType: "spo2",
    comparison: "below",
    threshold: 95,
    consecutive: 12,
    title: "SpO₂ below configured threshold, sustained",
    description: "SpO₂ < 95 % for 12 consecutive readings (≈ 60 s at a 5 s interval)",
  },
];

export function ruleById(id: RuleId): Rule {
  const rule = EVENT_RULES.find((candidate) => candidate.id === id);
  if (rule === undefined) throw new Error(`Unknown rule ${id}`);
  return rule;
}

function meets(rule: Rule, value: number): boolean {
  return rule.comparison === "above" ? value > rule.threshold : value < rule.threshold;
}

/** The more extreme of two values, in the direction the rule watches. */
function moreExtreme(rule: Rule, a: number, b: number): number {
  return rule.comparison === "above" ? Math.max(a, b) : Math.min(a, b);
}

/**
 * Evaluates every rule that watches this reading's vital. Call it inside the mutation that
 * inserted the reading, after the insert: the index read below then includes the new row, and
 * the reading and any event it opens, extends, or closes commit together.
 *
 * An event is an episode — one row per continuous run of qualifying readings, not one per
 * reading.
 */
export async function evaluateRulesForReading(
  ctx: MutationCtx,
  reading: Pick<Doc<"measurements">, "patientId" | "measurementType" | "value" | "observedAt">,
): Promise<void> {
  for (const rule of EVENT_RULES) {
    if (rule.measurementType !== reading.measurementType) continue;

    const open = await ctx.db
      .query("monitoringEvents")
      .withIndex("by_patientId_and_ruleId_and_status", (q) =>
        q.eq("patientId", reading.patientId).eq("ruleId", rule.id).eq("status", "open"),
      )
      .unique();

    // Step 1: a reading that breaks the condition ends any open episode, at this reading.
    if (!meets(rule, reading.value)) {
      if (open !== null) {
        await ctx.db.patch("monitoringEvents", open._id, {
          status: "closed",
          endedAt: reading.observedAt,
        });
      }
      continue;
    }

    // Step 2: an open episode simply continues.
    if (open !== null) {
      await ctx.db.patch("monitoringEvents", open._id, {
        lastObservedAt: reading.observedAt,
        readingCount: open.readingCount + 1,
        extremeValue: moreExtreme(rule, open.extremeValue, reading.value),
      });
      continue;
    }

    // Step 3: no episode yet. Open one only when the last N readings all qualify.
    const recent = await ctx.db
      .query("measurements")
      .withIndex("by_patientId_and_measurementType_and_observedAt", (q) =>
        q.eq("patientId", reading.patientId).eq("measurementType", rule.measurementType),
      )
      .order("desc")
      .take(rule.consecutive);

    if (recent.length < rule.consecutive) continue;
    if (!recent.every((row) => meets(rule, row.value))) continue;

    const values = recent.map((row) => row.value);

    await ctx.db.insert("monitoringEvents", {
      patientId: reading.patientId,
      ruleId: rule.id,
      rulesVersion: RULES_VERSION,
      status: "open",
      startedAt: recent[recent.length - 1].observedAt,
      lastObservedAt: reading.observedAt,
      readingCount: recent.length,
      extremeValue: values.reduce((a, b) => moreExtreme(rule, a, b)),
      isSynthetic: true,
    });
  }
}
