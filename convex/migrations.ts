// # Filename: convex/migrations.ts
import { v } from "convex/values";

import { internalMutation } from "./_generated/server";

/**
 * MIGRATION STAGE 2 — one-time cleanup of the Phase 3 fixture.
 *
 * Phase 3 seeded one patient with no owner, because ownership did not exist yet. That row
 * cannot be left in place: `ownerSubject` is about to become required, and an unowned
 * patient is a record no authorization rule can ever evaluate in the affirmative.
 *
 * Deleting is the right call here specifically because the data is a synthetic development
 * fixture that any user can recreate for themselves with `patients:ensureMyDemoPatient`.
 * Real records would be claimed or backfilled, never dropped.
 *
 * Measurements are deleted first: a measurement whose patient is gone is an orphan that no
 * ownership check can resolve, since ownership is proven through the parent.
 *
 * `internalMutation`, so this is not reachable from a browser.
 */
export const deleteUnownedPatients = internalMutation({
  args: {},
  returns: v.object({
    patientsDeleted: v.number(),
    measurementsDeleted: v.number(),
  }),
  handler: async (ctx) => {
    // The legacy rows are few and this runs once, so reading the table is acceptable here
    // in a way it would not be in a query on the hot path.
    const patients = await ctx.db.query("patients").take(1000);
    const unowned = patients.filter((patient) => patient.ownerSubject === undefined);

    let measurementsDeleted = 0;

    for (const patient of unowned) {
      const measurements = await ctx.db
        .query("measurements")
        .withIndex("by_patientId_and_observedAt", (q) => q.eq("patientId", patient._id))
        .take(1000);

      for (const measurement of measurements) {
        await ctx.db.delete("measurements", measurement._id);
        measurementsDeleted += 1;
      }

      await ctx.db.delete("patients", patient._id);
    }

    return { patientsDeleted: unowned.length, measurementsDeleted };
  },
});
