// # Filename: convex/authz.ts
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

/**
 * Authorization helpers. Plain async functions, not registered Convex functions — nothing
 * here is reachable from a client; these exist to be called at the top of the functions
 * that are.
 *
 * The rule these enforce: identity comes from the verified token and from nowhere else.
 * A caller may tell us *which record* it wants (a patientId). It may never tell us *who it
 * is*, because a browser can claim to be anyone.
 */

/**
 * Returns the caller's verified identity, or throws.
 *
 * `ctx.auth.getUserIdentity()` returns null when no token was presented, when the token
 * failed signature verification, or when auth.config.ts does not trust its issuer. All
 * three are the same answer from the caller's point of view: not authenticated.
 */
export async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (identity === null) {
    throw new Error("Not authenticated");
  }

  return identity;
}

/**
 * Returns the caller's stable subject claim — the Clerk user ID, as asserted by a token
 * Convex verified. This is the only value permitted to be written to `ownerSubject`.
 */
export async function requireSubject(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await requireIdentity(ctx);
  return identity.subject;
}

/**
 * Loads a patient and proves the caller owns it, or throws.
 *
 * Two distinct failures are deliberately collapsed into one message. "No such patient" and
 * "that patient belongs to someone else" are different facts, and reporting the difference
 * would let anyone enumerate which patient IDs exist by reading the error text.
 */
export async function requireOwnedPatient(
  ctx: QueryCtx | MutationCtx,
  patientId: Id<"patients">,
): Promise<Doc<"patients">> {
  const subject = await requireSubject(ctx);
  const patient = await ctx.db.get("patients", patientId);

  if (patient === null || patient.ownerSubject !== subject) {
    throw new Error("Patient not found");
  }

  return patient;
}
