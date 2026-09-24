// # Filename: src/features/learning/parts/request-pipeline/CtxSection.tsx
import { ArticleSection, C } from "../../components/ArticleSection";
import { Callout } from "../../components/Callout";
import { CapabilityTable } from "../../components/CapabilityTable";
import { CodeBlock } from "../../components/CodeBlock";

/**
 * Section 7 of Article 01. `ctx` as a per-invocation, per-type capability object: where it
 * comes from, the verified capability table, why actions have no database handle, and how
 * this repository's own helper signatures encode the difference. Static; a Server Component.
 */
export function CtxSection() {
  return (
    <ArticleSection id="ctx" number={7} title="ctx as a capability object">
      <p>
        <C>ctx</C> is not a global and not an import. It is the first argument Convex passes to
        your handler, built for this one invocation and typed for this one function type:
      </p>

      <CodeBlock
        path="convex/measurements.ts"
        code={`export const recordSyntheticHeartRate = mutation({
  args: { patientId: v.id("patients"), value: v.number() },
  // ...
  handler: async (ctx, args) => {
    // ctx: MutationCtx — built by Convex for this call, gone when it returns
    const patient = await requireOwnedPatient(ctx, args.patientId);`}
      />

      <p>
        Think of it as the list of things this function is <em>allowed</em> to do. Anything not
        on the list is not forbidden by a runtime check you might forget — it simply is not
        there to call. The table below is transcribed from the installed type definitions,
        convex 1.46.0; a member appears under a context only where that interface declares it.
      </p>

      <CapabilityTable />

      <p>Three differences carry most of the architecture:</p>

      <ul>
        <li>
          <strong>Query versus mutation is reader versus writer.</strong> Both get{" "}
          <C>ctx.db</C>, but a query&rsquo;s is a <C>GenericDatabaseReader</C>. A query that
          could write would not be safe to rerun on every change.
        </li>
        <li>
          <strong>An action has no <C>ctx.db</C> at all.</strong> A database handle only makes
          sense inside a transaction, and an action is not one: it may already have charged a
          card or called a model, which no rollback can undo. So database work is handed to a
          query or mutation through <C>ctx.runQuery</C> / <C>ctx.runMutation</C>, and each of
          those runs as its own complete transaction.
        </li>
        <li>
          <strong><C>runQuery</C> means different things in different contexts.</strong> Inside
          a query it runs in the same read snapshot; inside a mutation, in the same transaction;
          inside an action, as a separate transaction per call. Same name, different guarantee.
          The type docs add that a plain helper function is usually better than any of them.
        </li>
      </ul>

      <p>This repository already relies on the difference. Look at the helper signatures:</p>

      <CodeBlock
        path="convex/authz.ts"
        code={`export async function requireOwnedPatient(
  ctx: QueryCtx | MutationCtx,
  patientId: Id<"patients">,
): Promise<Doc<"patients">> {
  const subject = await requireSubject(ctx);
  const patient = await ctx.db.get("patients", patientId);`}
      />

      <p>
        <C>ActionCtx</C> is deliberately absent from that union. The helper reads{" "}
        <C>ctx.db</C>, which an action does not have, so passing an action&rsquo;s context is a
        compile error. A future action authorizes by calling an internal query that runs this
        same helper.
      </p>

      <Callout tone="correction" title="“Every ctx has the same tools.”">
        <p>
          Three different interfaces with different members. Guessing wrong is usually a type
          error — which is the point of reading capabilities from the generated types rather
          than from memory.
        </p>
      </Callout>
    </ArticleSection>
  );
}
