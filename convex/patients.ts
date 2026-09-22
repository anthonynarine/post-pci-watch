// # Filename: convex/patients.ts
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireSubject } from "./authz";
import {
  DEMO_KEY,
  DEMO_PATIENT,
  MEASUREMENT_FIXTURES,
  ingestedAtFor,
  observedAtFor,
} from "./fixtures";
import schema from "./schema";

/**
 * Returns the calling user's demo patient, or null if they have not created one.
 *
 * Takes no arguments at all. There is nothing for a caller to supply: the only input that
 * matters is the identity, and that is read from the verified token.
 */
export const getMyDemoPatient = query({
  args: {},
  returns: v.union(schema.doc("patients"), v.null()),
  handler: async (ctx) => {
    const ownerSubject = await requireSubject(ctx);

    // The index range starts at the owner, so this read can only ever see one user's rows.
    // Scoping by index rather than filtering afterwards means the other users' documents
    // are never read in the first place.
    return await ctx.db
      .query("patients")
      .withIndex("by_ownerSubject_and_demoKey", (q) =>
        q.eq("ownerSubject", ownerSubject).eq("demoKey", DEMO_KEY),
      )
      .unique();
  },
});

/**
 * Creates the calling user's own demo patient and its measurements, once.
 *
 * Idempotent per user: calling it twice returns the same patient without duplicating
 * anything. Two different users calling it produce two independent patients with identical
 * fixture values — which is what makes the isolation test meaningful, since any difference
 * in what they can read comes from ownership alone.
 *
 * This is a public `mutation` rather than an `internalMutation` because the browser calls
 * it. That is safe in a way the Phase 3 seed was not: it accepts no arguments, writes only
 * fixture constants, and stamps the record with the caller's verified subject. A caller
 * cannot choose what is written or who it belongs to.
 */
export const ensureMyDemoPatient = mutation({
  args: {},
  returns: v.object({
    created: v.boolean(),
    patientId: v.id("patients"),
  }),
  handler: async (ctx) => {
    const ownerSubject = await requireSubject(ctx);

    const existing = await ctx.db
      .query("patients")
      .withIndex("by_ownerSubject_and_demoKey", (q) =>
        q.eq("ownerSubject", ownerSubject).eq("demoKey", DEMO_KEY),
      )
      .unique();

    if (existing !== null) {
      return { created: false, patientId: existing._id };
    }

    const patientId: Id<"patients"> = await ctx.db.insert("patients", {
      ...DEMO_PATIENT,
      ownerSubject,
    });

    for (const fixture of MEASUREMENT_FIXTURES) {
      await ctx.db.insert("measurements", {
        patientId,
        measurementType: fixture.measurementType,
        value: fixture.value,
        unit: fixture.unit,
        observedAt: observedAtFor(fixture),
        ingestedAt: ingestedAtFor(fixture),
        sourceDeviceId: fixture.sourceDeviceId,
        sourceType: fixture.sourceType,
        isSynthetic: true,
      });
    }

    return { created: true, patientId };
  },
});
